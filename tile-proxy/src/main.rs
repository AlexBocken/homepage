//! Region-switching map tile proxy.
//!
//! Exposes one canonical XYZ scheme — `/{layer}/{z}/{x}/{y}` for
//! `layer ∈ {karte, luftbild, dufour}` — and, per tile, serves swisstopo when
//! the tile overlaps a swisstopo-covered region (Switzerland or Liechtenstein,
//! each buffered ~2 km) and a global provider otherwise:
//!
//! | layer    | swisstopo region (CH + LI)   | elsewhere                            |
//! |----------|------------------------------|--------------------------------------|
//! | karte    | ch.swisstopo.pixelkarte-farbe| Thunderforest Outdoors (or OpenTopo) |
//! | luftbild | ch.swisstopo.swissimage      | Esri World Imagery                   |
//! | dufour   | ch.swisstopo.hiks-dufour     | — (CH/LI-only historical)            |
//!
//! The `karte` upstream abroad is Thunderforest Outdoors when the
//! `THUNDERFOREST_API_KEY` env var is set at *build* time (it's baked into
//! the binary via `option_env!`), otherwise OpenTopoMap (whose hypsometric
//! tint reads "red mountains / green flats"). `build.rs` reads the key from
//! `tile-proxy/.env` (gitignored) or a shell env var, and requests a
//! recompile when either changes.
//!
//! `/vt/…` is a pass-through to swisstopo's vector tiles
//! (vectortiles.geo.admin.ch) for the "Imagery Basemap" style — swissimage
//! with vector labels on top. Its JSON (style.json, tiles.json) is rewritten
//! so every URL inside points back at this proxy, and the style's aerial
//! source is swapped for our own `luftbild` layer, so the imagery still falls
//! back to Esri abroad.
//!
//! swisstopo's vector data stops at the border, so the style is also given
//! OpenFreeMap labels, paths and roads (`src/ofm-layers.json`), hidden inside
//! Switzerland and Liechtenstein (`src/border.json`). `/ofm/…` passes those
//! tiles through from tiles.openfreemap.org the same way.
//!
//! Caching, TLS and rate-limiting live in nginx in front of this service
//! (see README.md) — this binary only does the routing + upstream fetch.

use std::net::SocketAddr;
use std::sync::OnceLock;
use std::time::Duration;

use axum::{
    extract::{OriginalUri, Path},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};

/// Polygons swisstopo covers — Switzerland and Liechtenstein — each a ring
/// `[[lng, lat], …]` (simplified + ~2 km outward buffer). Regenerate with
/// `node scripts/gen-regions.mjs`.
static REGIONS: &[&[[f64; 2]]] = include!("regions.in");

/// Generous bounding box (west, south, east, north) over all regions, for a
/// cheap reject before the full polygon intersection test.
const REGION_BBOX: (f64, f64, f64, f64) = (5.8, 45.7, 10.7, 48.0);

fn client() -> &'static reqwest::Client {
    static C: OnceLock<reqwest::Client> = OnceLock::new();
    C.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent("bocken.org hiking tile cache (+https://bocken.org)")
            .timeout(Duration::from_secs(20))
            .build()
            .expect("build reqwest client")
    })
}

/// Ray-casting point-in-polygon for a single ring.
fn point_in_ring(ring: &[[f64; 2]], lng: f64, lat: f64) -> bool {
    let n = ring.len();
    let mut inside = false;
    let mut j = n - 1;
    for i in 0..n {
        let (xi, yi) = (ring[i][0], ring[i][1]);
        let (xj, yj) = (ring[j][0], ring[j][1]);
        if (yi > lat) != (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi {
            inside = !inside;
        }
        j = i;
    }
    inside
}

/// Web-mercator tile bounds → (west, south, east, north) in degrees.
fn tile_bounds(z: u32, x: u32, y: u32) -> (f64, f64, f64, f64) {
    let n = 2f64.powi(z as i32);
    let lat = |yy: f64| {
        (std::f64::consts::PI * (1.0 - 2.0 * yy / n))
            .sinh()
            .atan()
            .to_degrees()
    };
    let west = x as f64 / n * 360.0 - 180.0;
    let east = (x as f64 + 1.0) / n * 360.0 - 180.0;
    (west, lat(y as f64 + 1.0), east, lat(y as f64)) // y increases southward
}

/// Do segments p1p2 and p3p4 strictly cross?
fn segments_cross(p1: [f64; 2], p2: [f64; 2], p3: [f64; 2], p4: [f64; 2]) -> bool {
    let o = |a: [f64; 2], b: [f64; 2], c: [f64; 2]| {
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    };
    (o(p3, p4, p1) > 0.0) != (o(p3, p4, p2) > 0.0)
        && (o(p1, p2, p3) > 0.0) != (o(p1, p2, p4) > 0.0)
}

/// True if the tile's lat/lng rectangle intersects any swisstopo region
/// (CH or LI) — i.e. any part of the tile lies within the covered area
/// (corner inside, region vertex inside the tile, or edges crossing).
fn tile_intersects_regions(z: u32, x: u32, y: u32) -> bool {
    let (w, s, e, n) = tile_bounds(z, x, y);
    let (bw, bs, be, bn) = REGION_BBOX;
    if e < bw || w > be || n < bs || s > bn {
        return false; // tile bbox doesn't even touch the regions' bbox
    }
    let corners = [[w, s], [e, s], [e, n], [w, n]];
    for ring in REGIONS {
        if corners.iter().any(|c| point_in_ring(ring, c[0], c[1])) {
            return true; // a tile corner is inside this region
        }
        if ring
            .iter()
            .any(|p| p[0] >= w && p[0] <= e && p[1] >= s && p[1] <= n)
        {
            return true; // a region vertex is inside the tile
        }
        let len = ring.len();
        for i in 0..len {
            let a = ring[i];
            let b = ring[(i + 1) % len];
            for k in 0..4 {
                if segments_cross(a, b, corners[k], corners[(k + 1) % 4]) {
                    return true; // region border crosses a tile edge
                }
            }
        }
    }
    false
}

fn swisstopo(bod: &str, ext: &str, z: u32, x: u32, y: u32) -> String {
    format!("https://wmts.geo.admin.ch/1.0.0/{bod}/default/current/3857/{z}/{x}/{y}.{ext}")
}

/// `(primary, fallback)` upstream URLs for a layer + tile. `fallback` is tried
/// when the primary has no tile (e.g. a swisstopo border tile just outside its
/// coverage) — it's the global provider, or `None` when there's no alternative.
fn upstreams(layer: &str, z: u32, x: u32, y: u32) -> Option<(String, Option<String>)> {
    // Favour the swisstopo regions (CH + LI) at every zoom: if the tile touches
    // either at all, use swisstopo (a swisstopo tile partly outside its data
    // just renders white at the edges, preferable to a foreign provider over
    // covered ground).
    let swiss = tile_intersects_regions(z, x, y);
    let opentopo = || format!("https://a.tile.opentopomap.org/{z}/{x}/{y}.png");
    // Thunderforest Outdoors looks much closer to swisstopo (subtle hillshade,
    // muted topo palette, hiking paths) than OpenTopoMap's hypsometric tint.
    // Used as the foreign `karte` upstream when a build-time API key is
    // baked in; otherwise we fall back to OpenTopoMap.
    let outdoors_abroad = || match THUNDERFOREST_API_KEY {
        Some(key) => format!("https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={key}"),
        None => opentopo(),
    };
    // NB: Esri uses {z}/{y}/{x} (row before column).
    let esri = || {
        format!("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")
    };
    match layer {
        "karte" if swiss => Some((swisstopo("ch.swisstopo.pixelkarte-farbe", "jpeg", z, x, y), Some(outdoors_abroad()))),
        "karte" => Some((outdoors_abroad(), None)),
        "luftbild" if swiss => Some((swisstopo("ch.swisstopo.swissimage", "jpeg", z, x, y), Some(esri()))),
        "luftbild" => Some((esri(), None)),
        // Historical Dufour map only exists for Switzerland.
        "dufour" => Some((swisstopo("ch.swisstopo.hiks-dufour", "png", z, x, y), None)),
        _ => None,
    }
}

/// Public origin of this service, used to point the rewritten vector-tile
/// JSON back at ourselves. MapLibre needs absolute URLs there.
fn public_url() -> &'static str {
    static U: OnceLock<String> = OnceLock::new();
    U.get_or_init(|| {
        std::env::var("TILE_PROXY_PUBLIC_URL")
            .unwrap_or_else(|_| "https://maps.bocken.org".to_string())
            .trim_end_matches('/')
            .to_string()
    })
}

const VT_UPSTREAM: &str = "https://vectortiles.geo.admin.ch/";

/// The only upstream paths `/vt/` forwards — the one style we use, the
/// tileset it draws from, and the fonts its labels need.
const VT_ALLOWED: &[&str] = &[
    "styles/ch.swisstopo.imagerybasemap.vt/",
    "tiles/ch.swisstopo.base.vt/",
    "fonts/",
];

const OFM_UPSTREAM: &str = "https://tiles.openfreemap.org/";

/// Point one URL from the upstream vector-tile JSON back at this proxy.
fn rewrite_vt_url(s: &str) -> Option<String> {
    let base = public_url();
    if let Some(path) = s.strip_prefix(OFM_UPSTREAM) {
        return Some(format!("{base}/ofm/{path}"));
    }
    if s.starts_with("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/") {
        return Some(format!("{base}/luftbild/{{z}}/{{x}}/{{y}}"));
    }
    // vectortiles.geo.admin.ch and its vectortiles0…4 shards.
    let rest = s.strip_prefix("https://vectortiles")?;
    let rest = rest.trim_start_matches(|c: char| c.is_ascii_digit());
    let path = rest.strip_prefix(".geo.admin.ch/")?;
    Some(format!("{base}/vt/{path}"))
}

fn rewrite_vt_json(v: &mut serde_json::Value) {
    use serde_json::Value;
    match v {
        Value::String(s) => {
            if let Some(r) = rewrite_vt_url(s) {
                *s = r;
            }
        }
        Value::Array(items) => {
            items.iter_mut().for_each(rewrite_vt_json);
            // The shards collapse to one URL once rewritten.
            let mut seen = Vec::new();
            items.retain(|i| match i {
                Value::String(s) if s.starts_with(public_url()) => {
                    if seen.contains(s) {
                        false
                    } else {
                        seen.push(s.clone());
                        true
                    }
                }
                _ => true,
            });
        }
        Value::Object(map) => {
            // swissimage is only bounded to Switzerland upstream; ours covers
            // the world, so drop any bounds on the raster source.
            if map.get("type").and_then(Value::as_str) == Some("raster") {
                map.remove("bounds");
                map.insert("maxzoom".into(), Value::from(19));
            }
            map.values_mut().for_each(rewrite_vt_json);
        }
        _ => {}
    }
}

/// Is `path` the swisstopo style we merge OpenFreeMap into?
fn is_imagery_style(path: &str) -> bool {
    path.starts_with("styles/ch.swisstopo.imagerybasemap.vt/") && path.ends_with("style.json")
}

/// The OpenFreeMap layers from `src/ofm-layers.json`, with every
/// `"$outside-border"` marker replaced by the actual filter.
fn ofm_layers() -> &'static (Vec<serde_json::Value>, Vec<serde_json::Value>) {
    use serde_json::{json, Value};
    static L: OnceLock<(Vec<Value>, Vec<Value>)> = OnceLock::new();
    L.get_or_init(|| {
        let border: Value = serde_json::from_str(include_str!("border.json")).expect("border.json");
        let outside = json!(["!", ["within", border]]);
        fn fill(v: &mut Value, outside: &Value) {
            match v {
                Value::String(s) if s == "$outside-border" => *v = outside.clone(),
                Value::Array(items) => items.iter_mut().for_each(|i| fill(i, outside)),
                Value::Object(map) => map.values_mut().for_each(|i| fill(i, outside)),
                _ => {}
            }
        }
        let mut layers: Value = serde_json::from_str(include_str!("ofm-layers.json")).expect("ofm-layers.json");
        fill(&mut layers, &outside);
        let take = |key: &str| layers[key].as_array().cloned().unwrap_or_default();
        (take("below"), take("above"))
    })
}

/// Add the OpenFreeMap source and layers to swisstopo's style: lines just
/// above the imagery, labels on top of everything.
fn add_openfreemap(style: &mut serde_json::Value) {
    use serde_json::json;
    let (below, above) = ofm_layers();
    style["sources"]["openfreemap"] = json!({
        "type": "vector",
        "url": format!("{}/ofm/planet", public_url()),
        "attribution": "© OpenMapTiles © OpenStreetMap contributors"
    });
    let Some(layers) = style["layers"].as_array_mut() else {
        return;
    };
    let imagery = layers
        .iter()
        .position(|l| l["type"] == "raster")
        .map_or(0, |i| i + 1);
    layers.splice(imagery..imagery, below.iter().cloned());
    layers.extend(above.iter().cloned());
}

/// Fetch `path` from a vector-tile upstream. JSON (style, TileJSON) is
/// rewritten to point back at this proxy; everything else passes through.
async fn pass_through(upstream: &str, path: &str) -> Response {
    let Ok(r) = client().get(format!("{upstream}{path}")).send().await else {
        return StatusCode::BAD_GATEWAY.into_response();
    };
    let status = r.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return StatusCode::NOT_FOUND.into_response();
    }
    if !status.is_success() {
        return StatusCode::BAD_GATEWAY.into_response();
    }
    let content_type = r.headers().get(header::CONTENT_TYPE).cloned();
    let is_json = content_type
        .as_ref()
        .and_then(|ct| ct.to_str().ok())
        .is_some_and(|ct| ct.starts_with("application/json"))
        || path.ends_with(".json");
    let Ok(body) = r.bytes().await else {
        return StatusCode::BAD_GATEWAY.into_response();
    };
    let mut headers = HeaderMap::new();
    if is_json {
        let Ok(mut json) = serde_json::from_slice::<serde_json::Value>(&body) else {
            return StatusCode::BAD_GATEWAY.into_response();
        };
        rewrite_vt_json(&mut json);
        if upstream == VT_UPSTREAM && is_imagery_style(path) {
            add_openfreemap(&mut json);
        }
        headers.insert(header::CONTENT_TYPE, HeaderValue::from_static("application/json"));
        // Neither the style nor OpenFreeMap's TileJSON is versioned in its
        // URL — let upstream updates through.
        headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=86400"));
        return (StatusCode::OK, headers, json.to_string()).into_response();
    }
    if path.ends_with(".pbf") {
        headers.insert(header::CONTENT_TYPE, HeaderValue::from_static("application/x-protobuf"));
    } else if let Some(ct) = content_type {
        headers.insert(header::CONTENT_TYPE, ct);
    }
    // Tiles and sprites sit under versioned paths, fonts never change.
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=15552000"));
    (StatusCode::OK, headers, body.to_vec()).into_response()
}

// Both handlers forward the path still percent-encoded (font stacks contain
// spaces and commas); the query string is dropped.

async fn vector(OriginalUri(uri): OriginalUri) -> Response {
    match uri.path().strip_prefix("/vt/") {
        Some(path) if !path.contains("..") && VT_ALLOWED.iter().any(|p| path.starts_with(p)) => {
            pass_through(VT_UPSTREAM, path).await
        }
        _ => StatusCode::NOT_FOUND.into_response(),
    }
}

/// OpenFreeMap's TileJSON (`planet`) and its versioned tiles (`planet/…`).
async fn openfreemap(OriginalUri(uri): OriginalUri) -> Response {
    match uri.path().strip_prefix("/ofm/") {
        Some(path) if !path.contains("..") && (path == "planet" || path.starts_with("planet/")) => {
            pass_through(OFM_UPSTREAM, path).await
        }
        _ => StatusCode::NOT_FOUND.into_response(),
    }
}

/// Thunderforest Outdoors API key, baked into the binary at build time from
/// the `THUNDERFOREST_API_KEY` env var. When absent the `karte` layer falls
/// back to OpenTopoMap abroad. `build.rs` requests a rebuild whenever the
/// env var changes.
const THUNDERFOREST_API_KEY: Option<&str> = option_env!("THUNDERFOREST_API_KEY");

async fn fetch(url: &str) -> Option<Response> {
    let r = client().get(url).send().await.ok()?;
    if !r.status().is_success() {
        return None;
    }
    let content_type = r.headers().get(header::CONTENT_TYPE).cloned();
    let body = r.bytes().await.ok()?;
    let mut headers = HeaderMap::new();
    if let Some(ct) = content_type {
        headers.insert(header::CONTENT_TYPE, ct);
    }
    // Tiles are effectively immutable — let the nginx cache hold them long.
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=15552000"),
    );
    Some((StatusCode::OK, headers, body.to_vec()).into_response())
}

async fn tile(Path((layer, z, x, y)): Path<(String, u32, u32, u32)>) -> Response {
    let Some((primary, fallback)) = upstreams(&layer, z, x, y) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if let Some(resp) = fetch(&primary).await {
        return resp;
    }
    if let Some(fb) = fallback {
        if let Some(resp) = fetch(&fb).await {
            return resp;
        }
    }
    StatusCode::BAD_GATEWAY.into_response()
}

#[tokio::main]
async fn main() {
    // Bind address is fully env-driven; the default is just a convenience for
    // `cargo run` and is deliberately off the common 8080/8088 range.
    let addr: SocketAddr = std::env::var("TILE_PROXY_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8765".to_string())
        .parse()
        .expect("TILE_PROXY_ADDR must be host:port, e.g. 127.0.0.1:8765");

    let app = Router::new()
        .route("/:layer/:z/:x/:y", get(tile))
        .route("/vt/*path", get(vector))
        .route("/ofm/*path", get(openfreemap))
        .route("/healthz", get(|| async { "ok" }));

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind TILE_PROXY_ADDR");
    println!(
        "tile-proxy on http://{addr}  ({} regions, {} border points)",
        REGIONS.len(),
        REGIONS.iter().map(|r| r.len()).sum::<usize>()
    );
    axum::serve(listener, app).await.expect("serve");
}

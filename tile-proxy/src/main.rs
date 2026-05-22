//! Region-switching map tile proxy.
//!
//! Exposes one canonical XYZ scheme — `/{layer}/{z}/{x}/{y}` for
//! `layer ∈ {karte, luftbild, dufour}` — and, per tile, serves swisstopo when
//! the tile overlaps a swisstopo-covered region (Switzerland or Liechtenstein,
//! each buffered ~2 km) and a global provider otherwise:
//!
//! | layer    | swisstopo region (CH + LI)   | elsewhere                  |
//! |----------|------------------------------|----------------------------|
//! | karte    | ch.swisstopo.pixelkarte-farbe| OpenTopoMap                |
//! | luftbild | ch.swisstopo.swissimage      | Esri World Imagery         |
//! | dufour   | ch.swisstopo.hiks-dufour     | — (CH/LI-only historical)  |
//!
//! Caching, TLS and rate-limiting live in nginx in front of this service
//! (see README.md) — this binary only does the routing + upstream fetch.

use std::net::SocketAddr;
use std::sync::OnceLock;
use std::time::Duration;

use axum::{
    extract::Path,
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
    // NB: Esri uses {z}/{y}/{x} (row before column).
    let esri = || {
        format!("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")
    };
    match layer {
        "karte" if swiss => Some((swisstopo("ch.swisstopo.pixelkarte-farbe", "jpeg", z, x, y), Some(opentopo()))),
        "karte" => Some((opentopo(), None)),
        "luftbild" if swiss => Some((swisstopo("ch.swisstopo.swissimage", "jpeg", z, x, y), Some(esri()))),
        "luftbild" => Some((esri(), None)),
        // Historical Dufour map only exists for Switzerland.
        "dufour" => Some((swisstopo("ch.swisstopo.hiks-dufour", "png", z, x, y), None)),
        _ => None,
    }
}

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

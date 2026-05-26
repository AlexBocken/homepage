# tile-proxy

A tiny region-switching map-tile service for the hikes maps. It exposes one
canonical XYZ scheme and, **per tile**, serves **swisstopo inside Switzerland
& Liechtenstein** and a **global provider elsewhere** — so a hike anywhere in
the world gets a good schematic + satellite basemap, while CH/LI hikes keep
swisstopo quality.

```
browser / build script
        │   https://maps.bocken.org/{layer}/{z}/{x}/{y}
        ▼
   nginx   ── TLS termination + on-disk tile cache (proxy_cache)
        ▼   http://$TILE_PROXY_ADDR   (default 127.0.0.1:8765)
  tile-proxy (this crate)  ── z/x/y → point-in-polygon → pick + fetch upstream
        ▼
  swisstopo  │  OpenTopoMap  │  Esri World Imagery
```

The listen address is set entirely by the **`TILE_PROXY_ADDR`** env var
(`host:port`); pick whatever port you like. nginx, the systemd unit and this
binary all reference that one value.

Caching/TLS/rate-limiting live in **nginx** (Arch's stock nginx has no njs, and
we want a real geometry test anyway). This binary only does routing + fetch and
is stateless.

## Layers & providers

| `{layer}`  | swisstopo region (CH + LI)       | elsewhere                              |
|------------|----------------------------------|----------------------------------------|
| `karte`    | `ch.swisstopo.pixelkarte-farbe`  | Thunderforest Outdoors (or OpenTopoMap)|
| `luftbild` | `ch.swisstopo.swissimage`        | Esri World Imagery                     |
| `dufour`   | `ch.swisstopo.hiks-dufour`       | — (CH/LI-only)                         |

The `karte` upstream abroad is **Thunderforest Outdoors** when a
`THUNDERFOREST_API_KEY` is available at **build** time — it's baked into the
binary via `option_env!`. The key is read from `tile-proxy/.env` (gitignored)
by `build.rs`, or from a shell env var of the same name; both are watched so
the binary recompiles whenever the value changes. Without a key, the build
falls back to **OpenTopoMap** (no key needed, but its hypsometric tint reads
as "red mountains / green flats", which is why Thunderforest is preferred
when available).

```sh
# tile-proxy/.env  (gitignored)
THUNDERFOREST_API_KEY=your-key-here
```

The swisstopo region is **Switzerland + Liechtenstein** (swisstopo has
high-quality data for both). A tile is served by swisstopo when it **overlaps**
that region at all — the tile's lat/lng rectangle is intersected against the
polygons (`src/regions.in`, simplified + a **2 km outward buffer**), so *any*
tile touching CH/LI gets swisstopo, at every zoom. (A swisstopo tile partly
outside its data just renders white at the edges, which beats a foreign
provider drawing over covered ground.) For `karte`/`luftbild`, a swisstopo tile
that 404s near the edge falls back to the global provider automatically.

## Build & run

```sh
# Optional: drop a Thunderforest key in tile-proxy/.env for nicer abroad
# `karte` tiles; the build falls back to OpenTopoMap when the file is absent.
echo 'THUNDERFOREST_API_KEY=your-key-here' > .env
cargo build --release
TILE_PROXY_ADDR=127.0.0.1:8765 ./target/release/tile-proxy
# smoke test
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  http://127.0.0.1:8765/karte/9/266/180        # Bern  → swisstopo (jpeg)
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  http://127.0.0.1:8765/karte/9/255/171        # London → Thunderforest / OpenTopoMap (png)
```

`TILE_PROXY_ADDR` defaults to `127.0.0.1:8765` but should be set explicitly.
`GET /healthz` returns `ok`.

Run it as a service with [`deploy/tile-proxy.service`](deploy/tile-proxy.service)
and put nginx in front with [`deploy/nginx.conf.example`](deploy/nginx.conf.example).

## Regenerating the region polygons

`src/regions.in` is generated — don't hand-edit it. To refresh (or change the
buffer / simplification, or add a region):

```sh
make regions                                    # CH + LI, default 2 km buffer
BUFFER_KM=2 SIMPLIFY_DEG=0.004 node scripts/gen-regions.mjs
node scripts/gen-regions.mjs ./ch.geojson ./li.geojson   # local files
```

It takes each source's largest exterior ring, Douglas–Peucker–simplifies it,
then pushes every vertex outward by `BUFFER_KM`. Rebuild the binary afterwards
(the ring is baked in via `include!`). If you move the boundary, purge the nginx
cache so old tiles aren't served by the previous provider.

## Attribution (required)

All providers require credit — keep these on the page (the hikes pages show
them in the footer):

- **© swisstopo** — Swiss tiles.
- **Maps © Thunderforest, Data © OpenStreetMap contributors** — world schematic (when the key is baked in).
- **© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)** — world schematic (fallback build).
- **© Esri, Maxar, Earthstar Geographics** — world satellite.

## Notes

- **Max zoom** differs by provider — clamp the client: OpenTopoMap 17,
  Esri imagery ~19, swisstopo 19/20.
- **OpenTopoMap fair-use:** it's a small volunteer project; the long nginx
  cache + a descriptive `User-Agent` is the mitigation. If traffic grows,
  self-host a renderer.
- **Dufour** has no world equivalent — the client hides that layer when the
  view leaves Switzerland.

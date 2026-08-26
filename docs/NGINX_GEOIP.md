# nginx setup for the hike travel-time estimates

The hike pages show "ab Zürich ca. 2 h 10" before the reader has told us
anything. The hub in that sentence is picked from the visitor's IP, and the
lookup is **nginx's job**, not the app's: `ngx_http_geoip2_module` reads the
MaxMind GeoIP2 City database already on the server and passes the result to Node
as request headers. The app never opens an `.mmdb`, ships no GeoIP npm package,
and sends no visitor IP anywhere.

Without the config below nothing breaks — `resolveHub()` finds no headers, falls
back to Zürich, and the picker still works. The estimates are simply always
Zurich's until you wire it up.

## 1. Check the module is there

```sh
nginx -V 2>&1 | tr ' ' '\n' | grep -i geoip
```

You want `--add-module=.../ngx_http_geoip2_module` or, on Arch,
`--add-dynamic-module=...` plus a `load_module` line. If it is dynamic, the
`http {}` block needs it loaded first (this line goes at the *top level* of
`nginx.conf`, before `http {}`):

```nginx
load_module modules/ngx_http_geoip2_module.so;
```

Also confirm where the database actually is:

```sh
ls -l /usr/share/GeoIP/
```

`geoipupdate` writes `GeoIP2-City.mmdb` there for a paid subscription and
`GeoLite2-City.mmdb` for the free tier. Use whichever you have — the directives
below are identical, only the filename differs. The *City* database is required;
Country alone cannot tell Basel from Chur.

## 2. Declare the variables — `http {}` block

```nginx
http {
    # ...

    geoip2 /usr/share/GeoIP/GeoIP2-City.mmdb {
        auto_reload 60m;
        $geoip2_lat     location latitude;
        $geoip2_lon     location longitude;
        $geoip2_country country iso_code;
    }

    # ...
}
```

`auto_reload` picks up `geoipupdate`'s new file without an nginx restart. The
variables are empty strings when the database has no answer for an address,
which the app treats the same as absent.

## 3. Pass them on — the `server {}` / `location {}` that proxies to Node

Wherever `proxy_pass` points at the homepage app:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;

    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Client address. NOT $proxy_add_x_forwarded_for: that appends to whatever
    # the client sent, so a visitor could prepend their own address and pick
    # their own hub — and, more to the point, their own rate-limit bucket.
    # There is no upstream proxy here, so $remote_addr is the whole truth.
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP       $remote_addr;

    # GeoIP2 result. proxy_set_header always overwrites, so a client-supplied
    # X-Geo-* header cannot survive this.
    proxy_set_header X-Geo-Lat     $geoip2_lat;
    proxy_set_header X-Geo-Lon     $geoip2_lon;
    proxy_set_header X-Geo-Country $geoip2_country;
}
```

The three header names are the contract with `src/lib/server/geoip.ts`
(`x-geo-lat`, `x-geo-lon`, `x-geo-country`). Change them in one place and you
have to change the other.

## 4. Tell adapter-node to believe the header

`getClientAddress()` returns the socket peer — nginx — unless the adapter is
told which header carries the real address.

**These are read at runtime, so `.env_prod` is not where they take effect.**
`scripts/deploy.sh` sources that file to *build* with (`$env/static/private` is
inlined at build time) and never rsyncs it; the server's runtime environment is
`Environment=` lines in its systemd unit. The repo copy in `.env_prod` is there
so the file still records the whole production configuration — the one that
matters is on the server:

```sh
sudo systemctl edit homepage.service
```

```ini
[Service]
Environment=ADDRESS_HEADER=X-Forwarded-For
Environment=XFF_DEPTH=1
```

```sh
sudo systemctl daemon-reload && sudo systemctl restart homepage.service
```

`XFF_DEPTH=1` means "one trusted proxy": take the last entry. This is worth
doing regardless of the hub feature — every `rateLimit(getClientAddress())` in
`src/routes/api/**` is a single global bucket without it.

Only set `ADDRESS_HEADER` because step 3 makes the header trustworthy. Setting
it while nginx still appends to a client-supplied `X-Forwarded-For` hands
visitors control of their own address.

Verify afterwards — the address the app sees should be yours, not `127.0.0.1`:

```sh
systemctl show homepage.service -p Environment
```

## 5. Reload and verify

```sh
nginx -t && systemctl reload nginx
```

From an external host (not the server itself — `127.0.0.1` has no location):

```sh
curl -sI https://bocken.org/hikes | head -1
```

To see the values themselves, add a temporary debug location:

```nginx
location = /_geo {
    default_type text/plain;
    return 200 "$remote_addr $geoip2_country $geoip2_lat,$geoip2_lon\n";
}
```

`curl https://bocken.org/_geo` from a phone on mobile data and from a home
connection — the difference between the two is the whole reason the hub is a
visible dropdown and not a silent assumption. Remove the location afterwards.

## What the app does with it

`src/lib/server/geoip.ts` → nearest of the eleven hubs in `src/lib/hikes/hubs.ts`,
by straight-line distance, and only if the reader is within
`HUB_CATCHMENT_KM` (150 km) of one. Further away — or no headers at all — and it
falls back to Zürich.

Precedence, highest first:

1. `?hub=` in the URL (how the picker works with no script)
2. the `hikes_hub` cookie (the reader's last choice)
3. GeoIP2
4. Zürich

Nothing is logged and nothing is stored server-side; the cookie holds a hub id
and no more.

## The other half: the travel-time table

The hub only picks a *column*. The numbers come from `static/hikes-travel.json`,
built by `scripts/build-hike-travel.ts` against the live timetable and committed
to the repo. It is **fetched** by the hikes routes in `load`, not bundled — it
grows as hubs × hikes, and `src/lib/data/hikeTravel.generated.ts` holds nothing
but its hashed URL. A failed fetch is not fatal: the pages render without
travel times.

A leg the timetable gets wrong can be hand-set in `OVERRIDES` at the top of the
build script — a seasonal Postauto that answers "no connection" out of season,
for instance. Each entry records why.

**It spends a metered quota.** transport.opendata.ch defers to
[search.ch](https://search.ch/timetable/api/help), which allows **1000 route
searches per day**; one leg is one route search, and a full rebuild at eleven
hubs is ~330 of them. The script keeps a ledger in
`scripts/.cache/hikes-travel-spend.json`, stops at `DAILY_ROUTE_BUDGET` (700)
rather than letting the endpoint refuse, and paces itself at one request every
six seconds — so a full run takes about half an hour. That is also why it
cannot run at prebuild.

Never reach for `--refresh` out of habit: it discards the cache and re-spends
the entire quota. Adding a hike, or a hub, only costs its own new legs.

```sh
pnpm hikes:travel                     # only fetches what isn't cached
pnpm hikes:travel -- --slug=2026-mattstock
pnpm hikes:travel -- --interval=8000  # slower still
pnpm hikes:travel -- --refresh        # re-spends the whole quota; think first
```

Re-run it when the timetable changes (mid-December, and again when the summer
mountain-railway schedules start) and after adding a hike. The output records
the Saturday it was sampled for, which is shown in the estimate's tooltip — so a
table nobody has refreshed says so on the page rather than quietly ageing.

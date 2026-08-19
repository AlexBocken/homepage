# anki-web

Anki's own reviewer, editor and graphs in a browser, at `study.bocken.org`, for
anyone in the `anki_users` group.

This is a gateway, not a reimplementation. It supervises one
[ankiweb](https://git.bocken.org/Alexander/ankiweb) process per user — a FastAPI
app over the official `anki` pylib that serves Anki's *real* frontend — and
routes each authenticated browser to the right one.

## Why it works this way

**Each user's collection here is a separate copy, kept in step by sync.** It is
not the one `anki-bridge` serves. Anki's manual is explicit that the sync
server's folder must not be touched by another process — server and client
"must store separate copies", and "you must sync your data to the server, not
manually copy files into the server folder". So this is a sync client like any
phone or laptop, and `/var/lib/anki-web/<user>/` is its collection.

The practical consequence: **every user's collection now exists twice on this
host**, once under `/var/lib/anki-bridge/sync/` and once here. Both are secret
material and both need to be in the backup.

**One process per user, not one process holding several collections.** The
reviewer runs arbitrary user card templates through a Rust extension; a panic
there takes down the process it is in. With one process that is everyone's
session. Eviction also actually returns memory, which CPython would not.

**Sync is manual, with a real conflict prompt.** Matching desktop Anki rather
than inventing a policy: a full sync replaces one side wholesale, and which copy
survives is the user's decision, not ours.

Both the toolbar's Sync button and this supervisor post to the child's `/_sync`,
and only `/_activity` takes the per-instance secret. Guarding `/_sync` with it
too — as it was — 403s every press of the button, and buys nothing: the only
things that can open a child's socket are nginx, which has already authenticated
the one user that instance belongs to, and this service.

**Authentik does the authenticating, via a forward-auth outpost.** Not this
service. The site's own session cookie could never have worked here — Auth.js
sets it host-only on `bocken.org`, so the browser does not send it to a
subdomain, and widening it to `.bocken.org` would hand the session token to sso,
gitea, jellyfin and everything else on the domain. Rather than grow a bespoke
handoff, nginx asks the outpost and gets back `X-authentik-username`. Sessions,
MFA, and revoking access when someone leaves the group are all Authentik's,
which is much better at them than anything here would be.

**This service is not in the request path.** nginx routes straight to the right
child over its unix socket. All this does is start children and reclaim them.

## How a request flows

```
study.bocken.org/*  ──► nginx
   auth_request  ──► authentik outpost  → X-authentik-username
   proxy_pass http://unix:/run/anki-web/$anki_user.sock:/
        │
        ├─ socket exists ──► that user's ankiweb instance
        │                         │  manual sync, pylib
        │                         ▼
        │                    anki-bridge :8092 ──► anki --syncserver :27701
        │
        └─ no socket → 502 → @start → this service starts it, returns a
                                      self-refreshing "preparing…" page
```

Lazy start falls out of the 502: `$anki_user` survives into nginx's `error_page`
handler, so the hook knows who to start without a session of its own.

## The wait page

The "preparing…" page is the only thing a user ever sees from this service, and
for the seconds it is up it *is* bocken.org, so it is styled as bocken.org: the
nav pill, the mark, the palette and the font stack are the values `src/app.css`
resolves its semantic tokens to, copied literally. It is the same construction
as the offline page in `src/service-worker.ts` — both are standalone HTML shown
while the real app is unreachable, so neither can load a stylesheet, a font or a
favicon. **If the site's palette moves, it has to be moved here too.**

Three states, and the difference between them is whether the page will turn into
something else on its own:

| | animation | how it leaves |
|---|---|---|
| starting | deck deals a card | reloads itself as soon as the child answers |
| busy / broken | still | a "try again" button; nothing automatic |

Waiting is a poll, not a fixed interval: JS `HEAD`s the URL the user actually
asked for, backing off 0.5s → 3s, and reloads the moment it stops being a 503 —
so the study session opens as soon as it is ready rather than at the next tick.
A `<noscript>` meta-refresh every 2s covers browsers without JS; the two are
mutually exclusive on purpose, or the refresh would race the poll. After ~15s
the page admits that a first sync downloads the whole collection.

The copy follows `ANKI_WEB_LANG` (the language the child itself renders in), so
the page in front of the app and the app do not disagree about which language
this is.

## Looking like the site

Stock ankiweb paints Anki's own blue-on-grey with a flat toolbar, which made
study.bocken.org the one subdomain that reads as a different product. It is themed
instead of forked: ankiweb takes two URLs,

```
ANKIWEB_THEME_CSS   an extra stylesheet, linked after every vendored Anki sheet
ANKIWEB_THEME_JS    an extra script, run before ankiweb's own bootstrap
```

and the files behind them are **part of this site**, at
[`static/other/anki.css`](../static/other/anki.css) and `anki.js` — alongside the
`jellyfin.css` / `gitea.css` / `searxng.css` that theme the other self-hosted services
here. So the palette lives next to the `src/app.css` it mirrors, restyling the study client
is a site deploy rather than a restart over here, and — the reason it is done this way —
ankiweb's frontend is re-vendored wholesale from the aqt wheel on every Anki bump, which
would destroy any theme kept inside it.

Anki's entire design system is ~60 CSS custom properties on `:root` / `:root.night-mode`,
so redefining those re-skins every screen, including the vendored SvelteKit pages, without
touching one of Anki's own selectors. On top of that the sheet rebuilds the header as the
site's floating glass pill — the mark, Lucide icons on every item, the current page marked,
the same three-state theme control (system → light → dark) — and restyles the screens you
live in: the deck list, the reviewer's answer row, the Browser and the editor column.

The icons are Lucide masks rather than images, so one copy of each takes its colour from the
item and lights up with it. To regenerate the set (or add one), the generator is four lines:

```sh
python3 - <<'EOF'
import json, re, pathlib, urllib.parse
src = pathlib.Path("node_modules/@lucide/svelte/dist/icons")
nodes = json.loads(re.search(r"iconNode[^=]*=\s*(\[.*?\]\s*\])\s*;",
                             (src / "layers.svelte").read_text(), re.S).group(1))
body = "".join("<%s %s/>" % (t, " ".join(f'{k}="{v}"' for k, v in a.items())) for t, a in nodes)
svg = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#000' "
       "stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'>" + body + "</svg>")
print('url("data:image/svg+xml,' + urllib.parse.quote(svg, safe="/:=,;()[]{}'.- ") + '")')
EOF
```

The script follows `prefers-color-scheme` (upstream defaults to light and only goes dark via
the moon button), owns the theme button so a press applies immediately instead of reloading,
and keeps the `#night` hash the vendored SvelteKit pages read in step with it — the three
disagreeing was what made the old toggle look unreliable.

### Cards

Card content is the user's own note-template CSS and the stylesheet leaves it alone. One
thing does reach in, in `anki.js`, because leaving it alone did not work: Anki's stock
notetype hardcodes `color: black; background-color: white`, so in dark mode the study screen
was a black app around a white slab.

Two steps, in this order:

1. **The theme is handed to the card.** Anki's convention for "this is being shown in the
   dark" is a `nightMode` / `night_mode` class on the body, which the desktop client sets and
   ankiweb does not. Setting it turns on three rules the vendored `reviewer.css` was already
   waiting for — the canvas/foreground body colours, and the LaTeX and drawing inversions —
   and makes every notetype that follows the documented convention work. It has to be
   re-applied per card: `reviewer.js` assigns `body.className` wholesale on every question,
   from the card's own classes, which drops anything else that was there.
2. **What still fails is repaired, and only that.** A pass measures each colour and moves it
   only if it is wrong: a background on the wrong side of the theme (by CIE L\*, not by
   luminance — mid grey sits mid-L\* but low-luminance, so luminance would call almost
   everything dark), or text below the WCAG contrast threshold against what it actually sits
   on. The fix keeps the author's hue by flipping lightness in HSL, so a red stays red; the
   outermost surface instead blends into the app canvas. A notetype that handles both themes
   measures fine and is never touched.

Images are left alone: Anki already inverts LaTeX and drawings, which are the two cases where
inverting is always right, and no script can tell a diagram from a photograph. Backgrounds
that are gradients or images are skipped for the same reason.

The colour decisions are unit-tested in `tests/unit/anki/cardContrast.test.ts`.

## Install on the server

**No venv, unlike the other services here.** Every dependency is an Arch
package, and one of them is `anki` itself — using the host's package is the
whole point, because it makes the study client the same build as the sync server
it talks to, with no protocol skew between them. A venv would either shadow that
or have to be told to inherit it.

```sh
sudo pacman -S --needed anki python-fastapi python-uvicorn python-httpx
```

`python-uvicorn` and `python-httpx` are usually already present; `python-fastapi`
generally is not.

Then the service account. It is created once, by hand, because the unit no
longer uses `DynamicUser` (see *What separates one user from another*):

```sh
sudo useradd --system --no-create-home --shell /usr/bin/nologin anki-web
# nginx must be able to traverse /run/anki-web to reach the per-user sockets.
sudo usermod -aG anki-web http
sudo systemctl restart nginx      # group membership is read at start
```

Forgetting the `usermod`, or the nginx restart after it, gives a 502 on every
request with `Permission denied` in nginx's error log.

The gateway itself is plain files on `PYTHONPATH`:

```sh
sudo install -d /usr/share/webapps/homepage/anki-web
sudo cp gateway.py main.py instances.py bridgeclient.py \
        /usr/share/webapps/homepage/anki-web/
```

And the study UI is a checkout of our fork, beside it:

```sh
sudo git clone -b bocken/study-gateway \
     https://git.bocken.org/Alexander/ankiweb.git \
     /usr/share/webapps/homepage/ankiweb
```

Both paths are on `PYTHONPATH` in the unit. Files must stay world-readable —
the service runs under `DynamicUser`.

The fork needs its frontend vendored, which is **not** in its git tree:

```sh
cd /usr/share/webapps/homepage/ankiweb
python3 tools/fetch_web_assets.py
```

`AQT_VERSION` in that script must match the host's Anki (currently `26.8`).
`anki`, `aqt` and the vendored `web_assets/` share a buildhash and cannot be
mixed — bumping Anki on this host means re-running it. A mismatch is not a clean
error: the page loads and the reviewer silently fails to start.

Then the secrets file:

```sh
sudo install -d -m 700 /etc/anki-web
sudo tee /etc/anki-web/env >/dev/null <<'EOF'
ANKI_BRIDGE_TOKEN=<same value as BRIDGE_TOKEN in /etc/anki-bridge/env>
EOF
sudo chmod 600 /etc/anki-web/env
```

One secret, because Authentik holds everything else. There is no session key, no
ticket signing secret and no cookie to sign.

### Authentik

Create a **Proxy Provider** in forward-auth (single application) mode for
`https://study.bocken.org`, assign it to an outpost, and bind a policy requiring
the `anki_users` group. Losing the group then ends access at Authentik, with no
deploy and nothing to invalidate here.

## Run as a service

```sh
sudo cp anki-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now anki-web
curl -s localhost:8093/healthz
```

Same hardening as `anki-bridge`, including the same exception: **no blanket
`IPAddressDeny=any`**, because this service must reach Authentik to re-confirm
group membership on live sessions.

`TimeoutStopSec=180` is deliberate — the shutdown hook syncs every live instance
out before the service goes away, and reviews exist only in a child's collection
until it does.

## nginx

authentik's recommended proxy-provider config, with the per-user routing folded
in. Verified against nginx 1.30.4 with a stubbed outpost: the `unix:` form takes
a variable, `$anki_user` survives into the `error_page` handler, WebSocket
upgrades pass through, and the outpost's `Set-Cookie` reaches the browser.

```nginx
# '' maps to '' rather than "close": with proxy_http_version 1.1 that leaves the
# connection to the child reusable, instead of tearing it down per request.
map $http_upgrade $connection_upgrade_keepalive { default upgrade; '' ''; }

server {
    listen 443 ssl;
    http2 on;
    server_name study.bocken.org;

    ssl_certificate     /etc/letsencrypt/live/study.bocken.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/study.bocken.org/privkey.pem;

    # authentik's headers are large. Without this you get "upstream sent too big
    # header while reading response header from upstream" — which reads like a
    # broken app and is really just a buffer.
    proxy_buffers 8 16k;
    proxy_buffer_size 32k;

    client_max_body_size 250m;        # apkg and media imports
    proxy_read_timeout 600s;

    # NOT proxy_request_buffering off — unlike anki.bocken.org. auth_request
    # reads the whole request body before issuing its subrequest, so the two
    # settings fight; the vhosts must not share a snippet.

    add_header X-Robots-Tag "noindex, nofollow" always;

    # Desktop Anki pointed at this host instead of anki.bocken.org. Without this
    # the outpost answers a sync request the only way it can — a redirect into
    # the SSO flow — and Anki reports the redirect rather than the mistake:
    # `HttpError { code: 303, context: "reading stream" }`, which names neither
    # the wrong host nor the right one. Declared before `location /` so it wins,
    # and scoped to Anki's own sync prefixes: this app's routes are `/_sync` and
    # `/_anki/…`, so nothing of ours matches.
    location ~ ^/m?sync/ {
        default_type text/plain;
        return 400 "This is the browser study client, not the sync server.\nSet Anki's self-hosted sync server to https://anki.bocken.org/ instead.\n";
    }

    location / {
        auth_request     /outpost.goauthentik.io/auth/nginx;
        error_page       401 = @goauthentik_proxy_signin;
        # Relays the outpost's session cookie to the browser. Without it the
        # sign-in round trip never completes and you loop through the flow
        # forever, having authenticated successfully every time.
        auth_request_set $auth_cookie $upstream_http_set_cookie;
        add_header       Set-Cookie $auth_cookie;
        # add_header at this level DROPS every inherited one, so the server's
        # X-Robots-Tag has to be repeated here or it silently stops being sent.
        add_header       X-Robots-Tag "noindex, nofollow" always;

        # The only header we actually need: it becomes the socket path.
        auth_request_set $anki_user $upstream_http_x_authentik_username;

        # The socket name is the routing. $request_uri is REQUIRED: with a
        # variable in proxy_pass, nginx does not append the URI for you.
        proxy_pass http://unix:/run/anki-web/$anki_user.sock:$request_uri;
        proxy_set_header Host $host;

        # The reviewer is driven over a WebSocket; without these it loads and
        # then does nothing at all.
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade_keepalive;

        # No socket yet → 502 → start it. This is the whole lazy-start
        # mechanism; there is nothing else to it.
        error_page 502 503 504 = @start;
    }

    location @start {
        proxy_pass http://127.0.0.1:8093;
        proxy_set_header X-Anki-User $anki_user;
        proxy_set_header Host $host;
    }

    # Must be reachable without authentication, or the flow cannot start.
    location /outpost.goauthentik.io {
        proxy_pass              http://sso.bocken.org:9000/outpost.goauthentik.io;
        # authentik's own note: this must match your external authentik URL. If
        # the flow bounces or cookies do not stick, check here first.
        proxy_set_header        Host $host;
        proxy_set_header        X-Original-URL $scheme://$http_host$request_uri;
        add_header              Set-Cookie $auth_cookie;
        auth_request_set        $auth_cookie $upstream_http_set_cookie;
        proxy_pass_request_body off;
        proxy_set_header        Content-Length "";
    }

    location @goauthentik_proxy_signin {
        internal;
        add_header Set-Cookie $auth_cookie;
        return 302 /outpost.goauthentik.io/start?rd=$scheme://$http_host$request_uri;
    }
}
```

Two departures from authentik's template, both deliberate:

**The other identity headers are not translated.** Their template forwards
`X-authentik-groups`, `-email`, `-name`, `-uid` and `-entitlements` to the
upstream. ankiweb reads none of them — identity here is decided by *which socket*
the request reaches — and only `$anki_user` is needed, for the path. Add them
back if you ever want them in a child's logs.

**HTTP Basic is not enabled.** Their commented-out `$authentik_auth` block only
applies with "Send HTTP Basic authentication" turned on in the provider, which
this does not use.

The site sends `Strict-Transport-Security: … includeSubDomains`, so this
subdomain needs a valid certificate from day one — without one it is
unreachable, not merely warned about.

## Wire up the website

In the site's `.env` **and `.env_prod`** (`$env/static/private` is inlined at
build time, so a missing key is a build error):

```
ANKI_WEB_URL=http://127.0.0.1:8093
ANKI_WEB_TOKEN=<same value as in /etc/anki-web/env>
ANKI_WEB_PUBLIC_URL=https://study.bocken.org/
```

## Tests

```sh
PYTHONPATH=. python3 -m pytest tests/ -q
```

Everything touching the outside world — spawning, health polls, the clock — is
injected, so the suite exercises the state machine rather than a process tree.
What it covers: idle eviction driven by what the children report, the capacity
rule (never evict an active session), sync-before-stop ordering, crash backoff
and the circuit breaker, refusing path-shaped usernames, and the start hook's
behaviour on a full or broken server.

What it does **not** cover, and needs a manual pass on the server: the reviewer
itself, a real sync round trip, and an `.apkg` import (the one path that is both
large and mutating, and the one most likely to trip the buffering note above).

## Operations

- **A user's study session will not start.** `journalctl -u anki-web`. A failed
  start is usually the bridge: no credentials means no session, deliberately,
  because a collection that can never sync accumulates reviews nothing else sees.
- **Everything is slow / the box is swapping.** `ANKI_WEB_MAX_INSTANCES`. Each
  warm instance holds an open collection.
- **Someone lost access but is still studying.** Sessions are re-checked against
  Authentik hourly; `systemctl restart anki-web` ends them all immediately.
- **Anki was upgraded on this host.** Re-vendor the frontend (see install) — the
  buildhash pin means mismatched assets fail in confusing ways.

"""The lazy-start hook behind study.bocken.org.

Authentik's outpost authenticates; nginx routes straight to the right child over
its unix socket. So this service is deliberately **not** in the request path —
it exists to answer one question, "that user has no instance running, start
one", and to reclaim instances nobody is using.

The nginx side, verified against nginx 1.30.4:

    location / {
        auth_request /outpost.goauthentik.io/auth/nginx;
        auth_request_set $anki_user $upstream_http_x_authentik_username;
        proxy_pass http://unix:/run/anki-web/$anki_user.sock:/;
        error_page 502 503 504 = @start;
    }
    location @start { proxy_pass http://127.0.0.1:8093; }

`$anki_user` survives into the `error_page` handler, which is what makes the
lazy start work: no socket → 502 → here → spawn → wait page → the browser's
refresh lands on a running instance.

There is no session store, no cookie and no ticket here. Authentik owns all of
that, including MFA and revocation, and it is much better at it than anything
this service could grow.
"""

from __future__ import annotations

import logging
import os
from string import Template
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse

from instances import CapacityError, InstanceError, InstanceRegistry

log = logging.getLogger("anki-web.gateway")

#: Set by nginx from the outpost's answer. This service trusts it completely,
#: which is only safe because the socket it listens on is loopback-only and
#: nginx is the sole client — the same trust the other sidecars place in nginx.
USER_HEADER = os.environ.get("ANKI_WEB_USER_HEADER", "x-anki-user")

#: The child renders its UI in this language, so the wait page in front of it
#: should not switch to another one halfway through a click.
LANG = "en" if os.environ.get("ANKI_WEB_LANG", "de").startswith("en") else "de"

#: The site's mark, lifted verbatim from the SvelteKit offline page in
#: `src/service-worker.ts`. Both pages are standalone HTML served while the real
#: app is unreachable, so they are deliberately built the same way.
_LOGO = """<svg class="logo" viewBox="0 0 330 80.310541" xmlns="http://www.w3.org/2000/svg" fill="#d8dee9" aria-label="Bocken"><g fill="none" stroke="#d8dee9" stroke-width="3" transform="translate(-42.033271,-37.145192)"><path d="m 65.113709,84.638921 c -0.346049,-9.794303 8.85917,-32.693347 8.85917,-32.693347"/><path d="m 65.108044,84.684262 c 0.346049,-9.794303 -8.85917,-32.693347 -8.85917,-32.693347"/></g><g><path d="M 0,0 C 6.633,-3.91 14.348,-4.302 20.992,-1.732 20.009,5.333 15.93,11.893 9.31,15.795 2.69,19.697 -5.025,20.088 -11.669,17.519 -10.7,10.462 -6.62,3.901 0,0" transform="matrix(0.35277777,0,0,-0.35277777,4.116564,13.543871)"/><path d="m 0,0 c -6.62,3.901 -14.335,4.293 -20.979,1.724 0.97,-7.058 5.049,-13.618 11.669,-17.519 6.633,-3.91 14.348,-4.301 20.992,-1.732 C 10.699,-10.462 6.62,-3.902 0,0" transform="matrix(0.35277777,0,0,-0.35277777,10.339434,19.278333)"/><path d="M 0,0 C 6.633,-3.909 14.348,-4.301 20.992,-1.731 20.009,5.333 15.93,11.894 9.31,15.795 2.69,19.697 -5.026,20.088 -11.669,17.52 -10.7,10.461 -6.62,3.902 0,0" transform="matrix(0.35277777,0,0,-0.35277777,10.903454,36.572256)"/><path d="M 0,0 C 6.644,-2.57 14.358,-2.178 20.992,1.732 27.612,5.633 31.691,12.194 32.661,19.25 26.017,21.82 18.302,21.429 11.682,17.527 5.062,13.625 0.982,7.065 0,0" transform="matrix(0.35277777,0,0,-0.35277777,32.871328,24.119748)"/><path d="M 0,0 C 6.62,3.901 10.699,10.461 11.669,17.519 5.025,20.088 -2.689,19.696 -9.31,15.795 -15.93,11.893 -20.009,5.333 -20.992,-1.732 -14.348,-4.301 -6.633,-3.91 0,0" transform="matrix(0.35277777,0,0,-0.35277777,35.741597,35.870171)"/><path d="m -27.40181,13.441787 c 6.644,-2.57 14.359,-2.178 20.9920004,1.731 6.62000002,3.902 10.699,10.461 11.669,17.519 -6.644,2.569 -14.359,2.178 -20.9790004,-1.724 -6.62,-3.901 -10.7,-10.462 -11.682,-17.526" transform="matrix(0.35277777,0,0,-0.35277777,43.12113,17.474745)"/><path d="m 0,0 c 1.271,7.579 -1.125,14.922 -5.904,20.205 -6.242,-3.433 -10.906,-9.591 -12.178,-17.169 -1.275,-7.594 1.123,-14.937 5.902,-20.22 C -5.936,-13.736 -1.273,-7.578 0,0" transform="matrix(0.35277777,0,0,-0.35277777,20.082753,7.127875)"/><path d="m 0,0 c 1.271,7.579 -1.125,14.922 -5.904,20.206 -6.242,-3.434 -10.906,-9.592 -12.178,-17.17 -1.275,-7.593 1.123,-14.937 5.902,-20.22 C -5.937,-13.736 -1.273,-7.578 0,0" transform="matrix(0.35277777,0,0,-0.35277777,26.963346,20.756878)"/><path d="M 0,0 C 4.779,5.283 7.176,12.627 5.901,20.22 4.629,27.798 -0.035,33.956 -6.277,37.39 -11.055,32.106 -13.453,24.763 -12.18,17.184 -10.908,9.606 -6.244,3.448 0,0" transform="matrix(0.35277777,0,0,-0.35277777,29.06985,14.051408)"/></g><path d="M 0,0 -9.323,10.862 -3.185,17.76 0,21.339 3.173,17.774 9.324,10.862 Z M 41.228,66.513 C 41.168,66.275 38.492,57.729 32.099,49.53 28.9,45.41 24.801,41.388 19.697,38.388 15.112,35.701 9.727,33.802 3.198,33.324 L 0,36.917 -3.195,33.326 c -6.641,0.491 -12.102,2.451 -16.739,5.216 -7.724,4.607 -13.143,11.62 -16.561,17.559 -1.71,2.961 -2.918,5.631 -3.685,7.529 -0.383,0.949 -0.657,1.703 -0.83,2.204 -0.087,0.251 -0.148,0.438 -0.185,0.554 l -0.037,0.12 -0.006,0.017 -1.095,3.699 H -63.598 V 59.868 h 13.769 c 1.509,-3.763 4.398,-9.908 9.196,-16.216 3.801,-4.982 8.828,-10.072 15.38,-13.996 4.034,-2.422 8.662,-4.371 13.847,-5.556 l -3.872,-4.351 -7.799,-8.764 11.537,-13.441 c -5.22,-1.21 -9.868,-3.199 -13.916,-5.657 -9.751,-5.918 -16.085,-14.346 -20.051,-21.22 -2.011,-3.498 -3.414,-6.613 -4.323,-8.872 h -13.768 v -10.356 h 21.265 l 1.097,3.704 c 0.051,0.212 2.714,8.708 9.07,16.892 3.177,4.106 7.248,8.124 12.313,11.137 4.521,2.682 9.822,4.602 16.234,5.143 L 0,-15.9 l 3.619,4.215 c 6.533,-0.549 11.913,-2.527 16.488,-5.287 7.663,-4.624 13.036,-11.615 16.424,-17.525 1.694,-2.946 2.891,-5.601 3.652,-7.486 0.38,-0.943 0.651,-1.693 0.822,-2.19 0.085,-0.249 0.146,-0.435 0.183,-0.55 l 0.037,-0.119 0.004,-0.016 1.094,-3.703 h 21.268 v 10.356 H 49.825 c -1.499,3.743 -4.361,9.841 -9.105,16.111 -3.768,4.964 -8.752,10.044 -15.248,13.981 -4.052,2.46 -8.703,4.452 -13.928,5.661 l 11.534,13.437 -7.8,8.765 -3.867,4.345 c 5.185,1.183 9.812,3.13 13.845,5.55 9.835,5.899 16.218,14.364 20.21,21.275 2.032,3.529 3.447,6.672 4.36,8.948 H 63.591 V 70.224 H 42.323 Z" transform="matrix(0.35277777,0,0,-0.35277777,23.308833,63.179301)"/><path d="m 63.34524,67.259285 h 13.664006 c 7.392004,0 11.573339,-0.821334 15.082674,-2.912001 3.882669,-2.389335 6.197336,-7.242671 6.197336,-12.91734 0,-6.79467 -2.837334,-10.901338 -9.258671,-13.58934 4.256002,-2.389334 6.12267,-5.973336 6.12267,-11.424005 0,-4.778669 -1.792001,-8.810671 -4.928002,-11.125339 -3.136002,-2.240001 -7.242671,-3.210668 -13.962674,-3.210668 H 63.34524 Z m 5.525336,-5.002669 V 40.827272 h 6.57067 c 6.496003,0 9.781338,0.448001 12.096005,1.568001 3.285335,1.642668 5.152003,4.928002 5.152003,9.333338 0,3.808002 -1.717334,7.168003 -4.330669,8.512004 -2.613335,1.418667 -6.34667,2.016001 -11.946672,2.016001 z m 0,-26.432013 V 17.083261 h 6.645336 c 5.67467,0 8.736004,0.522667 10.826672,1.941334 1.941334,1.269334 3.210668,4.181336 3.210668,7.466671 0,3.808001 -1.493334,6.645336 -4.256002,7.91467 -2.314668,1.045334 -4.704002,1.418667 -9.706671,1.418667 z M 125.09456,25.445932 c -12.17067,0 -21.42935,9.184004 -21.42935,21.130676 0,12.618673 9.18401,21.653344 21.87735,21.653344 11.94667,0 20.75734,-9.034671 20.75734,-21.28001 0,-12.469339 -8.88534,-21.50401 -21.20534,-21.50401 z m 0,5.077335 c 9.03467,0 15.60534,6.944004 15.60534,16.501342 0,9.408004 -6.42134,16.128007 -15.30668,16.128007 -9.408,0 -16.128,-6.79467 -16.128,-16.426674 0,-9.258671 6.79467,-16.202675 15.82934,-16.202675 z m 63.46674,24.714679 c -4.256,5.674669 -8.13867,7.91467 -14.03734,7.91467 -9.10933,0 -16.352,-7.168003 -16.352,-16.277341 0,-9.184004 7.09333,-16.352008 16.20267,-16.352008 6.048,0 11.05067,2.912002 14.18667,8.288004 h 6.19734 C 191.4733,30.597934 183.6333,25.445932 174.4493,25.445932 c -12.24534,0 -21.87735,9.408004 -21.87735,21.28001 0,12.170672 9.70667,21.50401 22.25068,21.50401 5.07734,0 9.78134,-1.568001 13.58934,-4.629335 2.61333,-2.090668 4.18134,-4.106669 6.42134,-8.362671 z m 13.66395,12.021339 h 5.52534 v -8.437337 l 6.42133,-7.914671 13.58934,16.352008 h 6.86934 L 217.68126,46.949942 233.58527,26.416599 H 226.7906 L 207.75059,51.205944 V 12.080592 h -5.52534 z m 76.38406,-18.592009 c 0,-5.600003 -0.74667,-9.034671 -2.76267,-12.618673 -3.65867,-6.570669 -10.752,-10.602671 -18.59201,-10.602671 -11.872,0 -21.13068,9.333337 -21.13068,21.205343 0,12.096006 9.48268,21.578677 21.57868,21.578677 8.88534,0 16.87468,-5.749336 19.86134,-14.410673 h -5.74933 c -2.31467,5.600002 -8.06401,9.333337 -14.26134,9.333337 -8.43734,0 -15.45601,-6.421336 -15.90401,-14.48534 z m -36.81069,-5.002669 c 1.49334,-7.840004 7.69067,-13.14134 15.45601,-13.14134 7.91467,0 13.88801,4.928003 15.82934,13.14134 z m 44.42666,23.594678 h 5.52534 V 44.784608 c 0,-4.554669 0.59733,-6.944004 2.16533,-9.258671 2.16534,-3.136002 5.97334,-5.00267 10.30401,-5.00267 4.032,0 7.69067,1.642668 9.93067,4.405336 1.94133,2.538668 2.688,5.525336 2.688,10.901338 v 21.429344 h 5.52533 V 45.829941 c 0,-6.869336 -0.97066,-10.528005 -3.584,-14.03734 -3.21067,-4.106668 -8.13867,-6.346669 -13.888,-6.346669 -5.37601,0 -9.70668,2.016001 -13.14134,6.272003 v -5.301336 h -5.52534 z"/></svg>"""

#: Everything is inlined. While the page is up the user has *no* instance, so
#: nginx has nowhere to route a stylesheet or a favicon to — every subresource
#: request would come straight back here as another copy of this page.
#:
#: The colours, the font stack, the glass nav pill and the radii are the values
#: `src/app.css` resolves its semantic tokens to (light, then the dark override).
#: They have to be literal here — this page never sees the site's stylesheet —
#: so if the palette in app.css moves, it has to be moved here too.
#:
#: Both `backdrop-filter` spellings are written by hand on purpose: this string
#: never passes through Lightning CSS, so nothing auto-prefixes it. Same
#: exception as the offline page, and for the same reason.
_PAGE = Template("""<!doctype html>
<html lang="$lang"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex,nofollow">
$refresh<title>$title</title>
<style>
*{box-sizing:border-box;margin:0;font-family:Helvetica,Arial,"Noto Sans",sans-serif}
body{background:#f8f6f1;color:#2a2a2a;min-height:100svh;display:flex;flex-direction:column;
padding-top:env(safe-area-inset-top,0px)}
nav{position:sticky;top:calc(12px + env(safe-area-inset-top,0px));z-index:100;display:flex;
align-items:center;justify-content:center;height:3rem;padding:0 1.2rem;margin:12px auto 0;
width:fit-content;max-width:calc(100% - 1.5rem);border-radius:1000px;
background:rgba(46,52,64,0.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
border:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.25)}
nav .logo{height:1.4rem;width:auto;display:block}
main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
padding:2rem;text-align:center;gap:1rem}
h1{font-size:1.5rem;font-weight:600}
p{color:#555;max-width:360px;line-height:1.5}
.hint{font-size:0.85rem;color:#777;max-width:360px;line-height:1.5;margin-top:0.5rem}
button{padding:0.6rem 1.5rem;border:none;border-radius:1000px;background:#5E81AC;color:white;
font-size:0.9rem;cursor:pointer;box-shadow:0 0 0.4em 0.05em rgba(0,0,0,0.2);
transition:background 200ms}
button:hover{background:#81A1C1}
.deck{position:relative;width:84px;height:56px;perspective:640px;margin-bottom:0.5rem}
.deck b{position:absolute;inset:0;display:block;border-radius:0.75rem;background:#e8e5e1;
border:1px solid #ddd;box-shadow:0 0 0.5em 0.1em rgba(0,0,0,0.15)}
.deck b:nth-child(1){transform:translateY(11px) scale(.9);opacity:.45}
.deck b:nth-child(2){transform:translateY(5px) scale(.95);opacity:.7}
.deck b:nth-child(3){transform-origin:50% 100%;background:#5E81AC;border-color:transparent}
.wait .deck b:nth-child(3){animation:deal 1.9s cubic-bezier(.65,0,.35,1) infinite}
@keyframes deal{
0%{transform:rotateX(0) translateY(0);opacity:1}
40%{transform:rotateX(-96deg) translateY(-15px);opacity:.1}
48%,66%{transform:rotateX(-96deg) translateY(-15px);opacity:0}
80%{transform:rotateX(0) translateY(0);opacity:0}
100%{transform:rotateX(0) translateY(0);opacity:1}}
.calm .deck b:nth-child(3){background:#bbb}
.bar{height:5px;width:180px;max-width:60%;border-radius:1000px;background:#e8e5e1;
overflow:hidden;margin-top:0.5rem}
.bar i{display:block;height:100%;width:40%;border-radius:1000px;background:#5E81AC;
animation:sweep 1.6s ease-in-out infinite}
@keyframes sweep{0%{transform:translateX(-110%)}100%{transform:translateX(310%)}}
@media(prefers-color-scheme:dark){
body{background:#000;color:#e5e5e5}
nav{background:rgba(20,20,20,0.78);border-color:rgba(255,255,255,0.06)}
p{color:#aaa}
.hint{color:#888}
button{background:#88C0D0;color:#000}
button:hover{background:#8FBCBB}
.deck b{background:#222;border-color:#333;box-shadow:0 0 0.5em 0.1em rgba(0,0,0,0.35)}
.deck b:nth-child(3){background:#88C0D0}
.calm .deck b:nth-child(3){background:#444}
.bar{background:#222}
.bar i{background:#88C0D0}
}
@media(prefers-reduced-motion:reduce){
.deck b:nth-child(3){animation:none}
.bar i{width:100%;animation:pulse 1.8s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}}
</style></head>
<body class="$tone">
<nav>$logo</nav>
<main>
<div class="deck"><b></b><b></b><b></b></div>
<h1>$title</h1>
<p>$body</p>
$extra
</main>
$script</body></html>""")

#: The browser reloads itself as soon as the child answers, instead of waiting
#: out a fixed interval. `<noscript>` keeps the old meta-refresh for anyone
#: without JS — the two must not both run, or the reload races the poll.
_POLL = """<script>
(function(){var n=0,d=500,slow=document.getElementById('slow');
function again(){n++;if(n===14&&slow)slow.hidden=false;
d=Math.min(d*1.3,3000);setTimeout(poll,d)}
function poll(){fetch(location.href,{method:'HEAD',cache:'no-store'})
.then(function(r){if(r.status!==503){location.reload()}else{again()}},again)}
setTimeout(poll,d)})();
</script>"""

_COPY = {
    "de": {
        "starting": (
            "Sammlung wird vorbereitet…",
            "Deine Karten werden geladen. Beim ersten Mal dauert das etwas länger.",
            "Beim ersten Start wird die ganze Sammlung heruntergeladen – "
            "das kann eine Minute dauern.",
        ),
        "busy": (
            "Der Lernserver ist gerade ausgelastet",
            "Es lernt gerade jemand anderes. Versuch es in ein paar Minuten noch einmal.",
        ),
        "broken": (
            "Die Lernsitzung lässt sich nicht starten",
            "Das ist ein Fehler auf dem Server, nicht bei dir. "
            "Schau später noch einmal vorbei.",
        ),
        "retry": "Erneut versuchen",
    },
    "en": {
        "starting": (
            "Getting your collection ready…",
            "Your cards are loading. The first time takes a little longer.",
            "The first start downloads the whole collection – this can take a minute.",
        ),
        "busy": (
            "The study server is busy right now",
            "Someone else is studying. Try again in a few minutes.",
        ),
        "broken": (
            "This study session will not start",
            "That is a fault on the server, not on your side. Please check back later.",
        ),
        "retry": "Try again",
    },
}
_L = _COPY[LANG]


def _page(
    title: str,
    body: str,
    *,
    refresh: int | None = 2,
    slow: str | None = None,
) -> str:
    """One page in two moods: waiting, or stopped.

    `refresh` doubles as the switch — a page that is not going to turn into
    something else on its own gets no animation and no poll, and offers a
    button instead, because from there only the user can decide to retry.
    """
    waiting = refresh is not None
    if waiting:
        extra = '<div class="bar"><i></i></div>'
        if slow:
            extra += f'\n<p class="hint" id="slow" hidden>{slow}</p>'
    else:
        extra = f'<button onclick="location.reload()">{_L["retry"]}</button>'
    return _PAGE.substitute(
        lang=LANG,
        logo=_LOGO,
        title=title,
        body=body,
        tone="wait" if waiting else "calm",
        refresh=(
            f'<noscript><meta http-equiv="refresh" content="{refresh}"></noscript>'
            if waiting
            else ""
        ),
        extra=extra,
        script=_POLL if waiting else "",
    )


STARTING = _page(_L["starting"][0], _L["starting"][1], slow=_L["starting"][2])
BUSY = _page(_L["busy"][0], _L["busy"][1], refresh=None)
BROKEN = _page(_L["broken"][0], _L["broken"][1], refresh=None)


def create_app(*, registry: InstanceRegistry) -> FastAPI:
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/healthz")
    async def healthz() -> dict[str, Any]:
        return {"status": "ok", "instances": len(registry)}

    @app.api_route(
        "/{path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    )
    async def start(request: Request) -> HTMLResponse:
        """nginx's `@start` handler: whatever the user was asking for, they have
        no instance. Start one and tell them to wait.

        Catch-all rather than a fixed path because nginx forwards the original
        URI — the browser might have been asking for a stylesheet.
        """
        username = request.headers.get(USER_HEADER, "").strip()
        if not username:
            # nginx did not pass the outpost's username through. That is a
            # misconfiguration, not something a user can cause.
            log.error("no %s header on a start request", USER_HEADER)
            return HTMLResponse(BROKEN, status_code=503)

        try:
            await registry.ensure(username)
        except CapacityError:
            return HTMLResponse(BUSY, status_code=503)
        except InstanceError as exc:
            log.error("cannot start an instance for %s: %s", username, exc)
            return HTMLResponse(BROKEN, status_code=503)
        except Exception:
            log.exception("unexpected failure starting an instance for %s", username)
            return HTMLResponse(BROKEN, status_code=503)

        # 503 with a refresh, not a redirect: the browser retries the URL it
        # originally wanted, which by then goes straight to the child.
        return HTMLResponse(STARTING, status_code=503)

    return app

"""Anki sync bridge — Authentik in front of Anki's built-in sync server.

Anki's sync server knows nothing about external identity: its accounts are
`SYNC_USER1..N` env strings, fixed at startup. This service sits in front of it
so people can sync with their normal Authentik credentials.

Only one request in the whole protocol carries a password — `POST
/sync/hostKey`. The bridge intercepts exactly that one, verifies the credentials
against Authentik, swaps in the sync account it manages for that user, and lets
the sync server issue the session key. Every other request authenticates by that
key alone, so it is streamed straight through untouched.

    Anki client ──► nginx ──► bridge :8092 ──► anki --syncserver :27701 (child)
                                  │
                                  └──► Authentik (flow executor + admin API)

Bind it to localhost and let nginx terminate TLS in front — see README.md, which
also explains why `/internal/` must not be exposed.
"""

from __future__ import annotations

import contextlib
import json
import logging
import os
import time
from collections.abc import AsyncIterator

import httpx
import zstandard
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

from accounts import AccountStore
from authentik import (
    AuthentikError,
    GroupGate,
    UnsupportedFlowError,
    resolve_user,
    verify_password,
)
from supervisor import STATE_DIR, Supervisor

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("anki-bridge")

DB_PATH = os.environ.get("ACCOUNTS_DB", os.path.join(STATE_DIR, "accounts.db"))
# Shared secret for /internal/*, so the website can ask about a user. The
# endpoint is loopback-only as well; this is the second lock, not the only one.
BRIDGE_TOKEN = os.environ.get("BRIDGE_TOKEN", "")
# The URL users paste into Anki. Reported to the website so the settings page
# has one place to read it from.
PUBLIC_SYNC_URL = os.environ.get("ANKI_SYNC_PUBLIC_URL", "")
# Where a process on *this* host should point its sync client — anki-web's
# per-user instances. Loopback to the bridge rather than the public URL: it keeps
# the group re-check in the path (the proxy revokes by hkey on every request)
# without hairpinning a local sync out through nginx and TLS. Defaulted from the
# bind so the two cannot drift, with a wildcard bind read as loopback, since
# 0.0.0.0 is an address to listen on and not one to connect to.
_BIND_HOST = os.environ.get("BRIDGE_HOST", "127.0.0.1")
if _BIND_HOST in ("0.0.0.0", "::", "*", ""):
    _BIND_HOST = "127.0.0.1"
INTERNAL_SYNC_URL = os.environ.get(
    "ANKI_SYNC_INTERNAL_URL",
    f"http://{_BIND_HOST}:{os.environ.get('BRIDGE_PORT', '8092')}/",
)

# Per RFC 7230 these describe a single hop and must not be relayed.
HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}
# Dropped from the forwarded request on top of the hop-by-hop set: httpx sets
# Host from the target URL, and `content-length` is re-declared per request —
# `/sync/hostKey` rewrites the body to a different length, and everything else
# goes through `_framed_body` below.
SKIP_REQUEST_HEADERS = HOP_BY_HOP | {"host", "content-length"}

# A full-sync upload is ~100 MB over a slow link. Only the connect phase gets a
# deadline; read/write must not.
PROXY_TIMEOUT = httpx.Timeout(connect=10.0, read=None, write=None, pool=None)


class Bridge:
    """Everything with a lifetime longer than one request."""

    def __init__(self) -> None:
        self.accounts = AccountStore(DB_PATH)
        self.supervisor = Supervisor()
        self.groups = GroupGate()
        self.client = httpx.AsyncClient(timeout=PROXY_TIMEOUT)

    async def startup(self) -> None:
        await self.supervisor.start(self.accounts.render_env())

    async def shutdown(self) -> None:
        await self.supervisor.stop()
        await self.client.aclose()
        self.accounts.close()

    async def provision(self, username: str) -> None:
        """Make sure the sync server knows this user, restarting it if not."""
        _, created = self.accounts.ensure(username)
        if created:
            log.info("provisioning new sync account for %s", username)
            await self.supervisor.restart_with(self.accounts.render_env())


bridge: Bridge


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global bridge
    bridge = Bridge()
    await bridge.startup()
    try:
        yield
    finally:
        await bridge.shutdown()


app = FastAPI(title="anki-bridge", lifespan=lifespan)


# --------------------------------------------------------------------------- #
# Bridge's own endpoints. Declared before the catch-all so they win the match.
# --------------------------------------------------------------------------- #


@app.get("/health")
async def health() -> JSONResponse:
    up = bridge.supervisor.running and await bridge.supervisor.healthy()
    return JSONResponse(
        {"status": "ok" if up else "degraded", "sync_server": up, "in_flight": bridge.supervisor.in_flight},
        status_code=200 if up else 503,
    )


def _internal_ok(request: Request) -> bool:
    """The second lock on /internal/*. The first is that it is loopback-only and
    nginx 404s the prefix; an unset token fails closed rather than open."""
    return bool(BRIDGE_TOKEN) and request.headers.get("x-bridge-token") == BRIDGE_TOKEN


@app.get("/internal/status")
async def internal_status(request: Request, username: str) -> JSONResponse:
    """Provisioning state for one user, for the website's settings card."""
    if not _internal_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)

    account = bridge.accounts.get(username)
    return JSONResponse(
        {
            "provisioned": account is not None,
            "username": username,
            "sync_url": PUBLIC_SYNC_URL,
            "created_at": account.created_at if account else None,
            "last_seen": account.last_seen if account else None,
            "collection_bytes": _collection_bytes(username) if account else 0,
        }
    )


@app.post("/internal/sync-credentials")
async def internal_sync_credentials(request: Request, username: str) -> JSONResponse:
    """A session key for `username`, provisioning the account if it is new.

    This is for anki-web, which runs one Anki instance per user on this host and
    has to sync each of them against this server. Those instances never see a
    password — Authentik's outpost is what vouches for the username, one hop
    earlier — so there is no `/sync/hostKey` exchange for them to do.

    Nothing is minted here. Anki derives the session key from the account's own
    `user:pass` string, so the hkey already in the database *is* the key, and
    handing it over creates no new authority: it is the same one the user's own
    Anki client gets by logging in.
    """
    if not _internal_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)

    # Authorized before provisioned, so a name that is not a member — or not a
    # user at all — never creates a sync account or restarts the sync server.
    try:
        if not await bridge.groups.is_authorized(username):
            log.info("refused credentials for %s: not in %s", username, bridge.groups.group)
            return JSONResponse({"error": "forbidden"}, status_code=403)
    except AuthentikError:
        log.exception("Authentik unreachable while authorizing %s", username)
        return JSONResponse({"error": "auth backend unavailable"}, status_code=503)

    # Slow on a first-time user: a new account means restarting the sync server,
    # which drains in-flight syncs first. The caller allows for it.
    await bridge.provision(username)
    account = bridge.accounts.get(username)
    assert account is not None
    return JSONResponse(
        {"username": account.username, "hkey": account.hkey, "endpoint": INTERNAL_SYNC_URL}
    )


# --------------------------------------------------------------------------- #
# The one request that carries credentials.
# --------------------------------------------------------------------------- #


@app.post("/sync/hostKey")
async def host_key(request: Request) -> Response:
    body = await request.body()
    payload = _decode_payload(body)
    identifier = (payload or {}).get("u")
    password = (payload or {}).get("p")
    if not isinstance(identifier, str) or not isinstance(password, str) or not identifier:
        return Response(status_code=400)

    try:
        # Anki's login box takes a username or an email address, and people use
        # both. Canonicalise to the username *before* anything is keyed off it:
        # provisioning on the raw input would give one person two sync accounts
        # and two collections that then drift apart.
        user = await resolve_user(identifier)
        if user is None:
            log.info("rejected login for %s: no such account", identifier)
            return _denied()
        username = user["username"]

        # Submitted as typed, not canonicalised: this drives the same
        # identification stage as the website's login form, so the bridge
        # accepts exactly the identifiers Authentik's flow is configured for.
        if not await verify_password(identifier, password):
            log.info("rejected login for %s: bad credentials", username)
            return _denied()
        if not await bridge.groups.is_authorized(username):
            log.info("rejected login for %s: not in %s", username, bridge.groups.group)
            return _denied()
    except UnsupportedFlowError:
        log.exception("Authentik flow cannot be driven headlessly")
        return JSONResponse({"error": "auth flow unsupported"}, status_code=501)
    except AuthentikError:
        log.exception("Authentik unreachable while verifying %s", username)
        return JSONResponse({"error": "auth backend unavailable"}, status_code=503)

    await bridge.provision(username)
    account = bridge.accounts.get(username)
    assert account is not None

    # Hand the sync server its own credentials and let it mint the key. It stays
    # the only authority on what a valid session key is — the bridge never
    # invents one, even though `hkey = sha1("user:pass")` would let it.
    rewritten = _encode_payload({"u": account.username, "p": account.sync_secret})
    headers = _forward_headers(request.headers)
    async with bridge.supervisor.track_request():
        upstream = await bridge.client.post(
            f"{bridge.supervisor.upstream}/sync/hostKey", content=rewritten, headers=headers
        )

    if upstream.status_code != 200:
        # The account was just provisioned from our own store, so a rejection
        # here means the child is out of step with the database.
        log.error(
            "upstream refused the bridge's own credentials for %s (HTTP %d)",
            username,
            upstream.status_code,
        )
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=_response_headers(upstream.headers),
    )


# --------------------------------------------------------------------------- #
# Everything else: transparent streaming proxy.
# --------------------------------------------------------------------------- #


@app.api_route(
    "/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
)
async def proxy(request: Request, path: str) -> Response:
    hkey = _hkey_from(request)
    if hkey:
        account = bridge.accounts.by_hkey(hkey)
        if account is not None:
            # Session keys never expire on their own, so this is the only thing
            # standing between a user losing the group and losing access.
            try:
                if not await bridge.groups.is_authorized(account.username):
                    log.info("revoked session for %s: no longer in %s", account.username, bridge.groups.group)
                    return _denied()
            except AuthentikError:
                log.warning("group re-check failed for %s; allowing this request", account.username)
            bridge.accounts.touch(account.username, monotonic=time.monotonic())

    url = httpx.URL(f"{bridge.supervisor.upstream}/{path}").copy_with(
        query=request.url.query.encode() or None
    )
    headers = _forward_headers(request.headers)
    # A bodyless GET must stay bodyless: handing httpx an empty async iterator
    # would make it send `Transfer-Encoding: chunked` on a request that should
    # have no body at all.
    content = None
    if _has_body(request):
        content, length = await _framed_body(request)
        headers["content-length"] = str(length)

    upstream_request = bridge.client.build_request(
        request.method, url, headers=headers, content=content
    )

    # The request is only finished once its body has streamed back to the
    # client, so the in-flight count has to outlive this handler — a restart
    # that drains on the handler alone would cut live syncs. The exit stack is
    # closed by the response iterator, or by Starlette if the client vanishes.
    stack = contextlib.AsyncExitStack()
    await stack.__aenter__()
    try:
        await stack.enter_async_context(bridge.supervisor.track_request())
        upstream = await bridge.client.send(upstream_request, stream=True)
        stack.push_async_callback(upstream.aclose)
    except BaseException:
        await stack.aclose()
        raise

    async def body() -> AsyncIterator[bytes]:
        """Relay the upstream body, and do not turn its failures into tracebacks.

        The status line is already on the wire by the time this runs, so an
        upstream that dies mid-body cannot be reported as an error code — the
        client sees a truncated stream whatever we do. What it must not also do
        is surface as an unhandled ASGI exception: sixty lines of httpx and
        starlette frames that name neither the request nor how far it got, for a
        failure whose whole diagnosis is "the sync server went away during a
        100 MB download".
        """
        relayed = 0
        try:
            async for chunk in upstream.aiter_raw():
                relayed += len(chunk)
                yield chunk
        except httpx.HTTPError as exc:
            log.error(
                "upstream closed /%s after %d byte(s): %s — the sync server is "
                "gone or went away mid-response; the client will report a broken "
                "stream and retry",
                path, relayed, type(exc).__name__,
            )
        finally:
            await stack.aclose()

    return StreamingResponse(
        body(),
        status_code=upstream.status_code,
        headers=_response_headers(upstream.headers),
    )


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _denied() -> Response:
    """What the sync server itself returns for a bad login.

    Matching it means Anki shows its normal "wrong username/password" message
    rather than an unexplained failure.
    """
    return Response(status_code=403)


def _decode_payload(body: bytes) -> dict | None:
    """Read a sync request body: zstd-wrapped JSON since Anki 2.1.57.

    The frame carries no content size, so the streaming decompressor is the one
    that works. Uncompressed JSON is accepted as a fallback so an older or
    future client shape fails as a 400 rather than a 500.
    """
    for candidate in (_unzstd(body), body):
        if candidate is None:
            continue
        try:
            parsed = json.loads(candidate)
        except (ValueError, UnicodeDecodeError):
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def _unzstd(body: bytes) -> bytes | None:
    try:
        return zstandard.ZstdDecompressor().decompressobj().decompress(body)
    except zstandard.ZstdError:
        return None


def _encode_payload(payload: dict) -> bytes:
    return zstandard.ZstdCompressor().compress(json.dumps(payload).encode())


def _has_body(request: Request) -> bool:
    if request.headers.get("transfer-encoding"):
        return True
    return (_content_length(request) or 0) > 0


def _content_length(request: Request) -> int | None:
    raw = request.headers.get("content-length")
    if raw is None:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


async def _framed_body(request: Request) -> tuple[object, int]:
    """The body to forward, and the length the forwarded request must declare.

    Anki's sync server aborts a *response* part way through — resetting the
    connection, so the client reports a truncated stream — when the request that
    asked for it arrived with `Transfer-Encoding: chunked`. Small replies are
    already in the socket buffer by then and survive; only the two endpoints
    whose replies are large enough to still be arriving lose data
    (`/sync/download` and `/msync/downloadFiles`), which is what made it look
    like an intermittent network fault rather than something we were doing.

    Declaring a length is what avoids it, and httpx re-chunks a streamed body
    unless `Content-Length` is already set — so setting it is also what keeps the
    body streaming instead of being read into memory. A client that framed its
    own request as chunked leaves no length to forward and has to be buffered to
    get one; nothing Anki ships does that, and nginx buffers request bodies in
    front of us anyway.
    """
    length = _content_length(request)
    if length is None:
        buffered = await request.body()
        return buffered, len(buffered)
    return request.stream(), length


def _forward_headers(headers) -> dict[str, str]:
    return {k: v for k, v in headers.items() if k.lower() not in SKIP_REQUEST_HEADERS}


def _response_headers(headers) -> dict[str, str]:
    # `content-length` is dropped as well: the response is re-framed on the way
    # out, and a stale length would truncate it. `date` goes because uvicorn
    # stamps its own, and relaying upstream's leaves the response with two.
    skip = HOP_BY_HOP | {"content-length", "date"}
    return {k: v for k, v in headers.items() if k.lower() not in skip}


def _hkey_from(request: Request) -> str | None:
    """The session key, from wherever this request carries it.

    Normally the `anki-sync` header's `k` field; `GET /msync/begin` is the
    exception and passes it as the `k` query parameter (a leftover from the
    older protocol, see `SyncBeginQuery`).
    """
    raw = request.headers.get("anki-sync")
    if raw:
        try:
            parsed = json.loads(raw)
        except ValueError:
            parsed = None
        if isinstance(parsed, dict):
            key = parsed.get("k")
            if isinstance(key, str) and key:
                return key
    key = request.query_params.get("k")
    return key or None


def _collection_bytes(username: str) -> int:
    """On-disk size of one user's collection + media, for the settings card."""
    root = os.path.join(bridge.supervisor.sync_base, username)
    total = 0
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            with contextlib.suppress(OSError):
                total += os.path.getsize(os.path.join(dirpath, name))
    return total

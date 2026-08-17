"""Wires the gateway to real processes. This is what systemd runs.

Everything below is the part that was injected in tests: spawning a child,
polling it, asking when it last did anything, stopping it, syncing it. The
gateway and the registry know nothing about any of it.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import signal
import sys
from pathlib import Path

import httpx

from bridgeclient import BridgeError, fetch_credentials
from gateway import create_app
from instances import SOCKET_DIR, TERM_GRACE_SECS, Instance, InstanceRegistry

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("anki-web")

#: Where each user's *own* collection lives. Deliberately not the sync server's
#: folder under /var/lib/anki-bridge: Anki's docs are explicit that a second
#: process must not touch that, and the two are meant to be separate copies
#: reconciled by sync.
STATE_DIR = Path(os.environ.get("ANKI_WEB_STATE_DIR", "/var/lib/anki-web"))
CHILD_PYTHON = os.environ.get("ANKI_WEB_PYTHON", sys.executable)
PUBLIC_HOST = os.environ.get("ANKI_WEB_ALLOWED_HOST", "study.bocken.org")
SOURCE_URL = os.environ.get("ANKIWEB_SOURCE_URL", "")
CHILD_LANG = os.environ.get("ANKI_WEB_LANG", "de")
SWEEP_INTERVAL = float(os.environ.get("ANKI_WEB_SWEEP_INTERVAL", "60"))


def collection_path(username: str) -> Path:
    return STATE_DIR / username / "collection.anki2"


def _child_env(inst: Instance, hkey: str, endpoint: str) -> dict[str, str]:
    """Built from scratch rather than inherited.

    The bridge's supervisor does the same and for the same class of reason: a
    stray ANKIWEB_* or ANKI_SYNC_* left in this process's environment would be
    picked up by the child and quietly point it at the wrong collection or the
    wrong server.
    """
    return {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "LANG": os.environ.get("LANG", "C.UTF-8"),
        "PYTHONUTF8": "1",
        "PYTHONPATH": os.environ.get("PYTHONPATH", ""),
        "HOME": str(STATE_DIR / inst.username),
        "ANKIWEB_COLLECTION": str(collection_path(inst.username)),
        # The socket is the routing: nginx proxies to $anki_user.sock directly.
        "ANKI_WEB_UDS": str(inst.socket),
        # Without this the page renders but the WebSocket closes with 1008:
        # ankiweb re-checks the host guard on the upgrade separately, because
        # BaseHTTPMiddleware does not see upgrades.
        "ANKIWEB_ALLOWED_HOSTS": PUBLIC_HOST,
        "ANKIWEB_LANG": CHILD_LANG,
        # AGPL §13: we serve a modified version over a network, so we owe its
        # source to whoever we serve it to. ankiweb renders this on /about.
        "ANKIWEB_SOURCE_URL": SOURCE_URL,
        "ANKI_INSTANCE_KEY": inst.key,
        "ANKI_SYNC_HKEY": hkey,
        "ANKI_SYNC_ENDPOINT": endpoint,
    }


class Children:
    """Spawn/health/activity/stop/sync for real `ankiweb.serve_one` processes."""

    def _client(self, inst: Instance, read: float = 5.0) -> httpx.AsyncClient:
        # A client per call: each child is behind its own socket, so there is no
        # single connection pool to share. These are control-plane requests only
        # — nginx carries the actual traffic and never comes through here.
        return httpx.AsyncClient(
            transport=httpx.AsyncHTTPTransport(uds=str(inst.socket)),
            # Must be the host ankiweb was told to allow: it 403s any other
            # Host, and the health poll would fail forever with "forbidden host"
            # while looking like a child that never came up.
            base_url=f"http://{PUBLIC_HOST}",
            timeout=httpx.Timeout(connect=2.0, read=read, write=10.0, pool=2.0),
            headers={"x-anki-instance-key": inst.key},
        )

    def __init__(self) -> None:
        # Whether this user's collection existed before we started them. A
        # collection we just created has nothing to lose, which is the only case
        # where a full download can be taken without asking.
        self._fresh: dict[str, bool] = {}

    async def spawn(self, inst: Instance) -> asyncio.subprocess.Process:
        home = STATE_DIR / inst.username
        home.mkdir(parents=True, exist_ok=True)
        # 0700: this directory is a full copy of someone's collection.
        home.chmod(0o700)
        inst.socket.parent.mkdir(parents=True, exist_ok=True)
        self._fresh[inst.username] = not collection_path(inst.username).exists()

        try:
            creds = await fetch_credentials(inst.username)
        except BridgeError as exc:
            # Starting without credentials would give a study session that can
            # never sync — reviews would accumulate in a collection nothing else
            # ever sees. Better to fail the start.
            raise RuntimeError(f"no sync credentials for {inst.username}: {exc}") from exc

        return await asyncio.create_subprocess_exec(
            CHILD_PYTHON,
            "-m",
            "ankiweb.serve_one",
            env=_child_env(inst, creds.hkey, creds.endpoint),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=None,
        )

    async def health(self, inst: Instance) -> bool:
        async with self._client(inst) as client:
            res = await client.get("/healthz")
            return res.status_code == 200

    async def activity(self, inst: Instance) -> float | None:
        """When this child last served a request.

        nginx talks to the children directly, so this service never sees their
        traffic and cannot count it. The child is the only thing that knows.
        """
        async with self._client(inst) as client:
            res = await client.get("/_activity")
            if res.status_code != 200:
                return None
            return res.json().get("last_activity")

    async def sync_in(self, inst: Instance) -> None:
        """Pull the collection down once the child is up.

        A brand-new collection is empty, and with sync driven by hand there is
        nothing in the UI that would ever fill it — the user would be looking at
        a default deck wondering where their cards went.

        The full-download confirmation is skipped **only** for a collection this
        service just created. There is no local work to weigh against the
        server's copy, so asking would be theatre. For an existing collection the
        prompt stands: that is the user's decision, per the conflict policy.
        """
        fresh = self._fresh.pop(inst.username, False)
        async with self._client(inst, read=300.0) as client:
            res = await client.post("/_sync")
            body = res.json() if res.status_code == 200 else {}

            if body.get("ok"):
                return

            pending = body.get("pending_full_sync")
            if pending in ("FULL_DOWNLOAD", "FULL_SYNC") and fresh:
                log.info("first sync for %s: downloading the collection", inst.username)
                done = await client.post("/_sync/resolve", params={"direction": "download"})
                if done.status_code != 200 or not done.json().get("ok"):
                    log.error("first download for %s failed: %s", inst.username, done.status_code)
                return

            if pending:
                # Left for the user. The session still works on what is on disk.
                log.warning(
                    "%s needs a full sync (%s); leaving it for them to confirm",
                    inst.username, pending,
                )
            else:
                log.warning("initial sync for %s: %s", inst.username, body.get("last_outcome"))

    async def sync_out(self, inst: Instance) -> None:
        """Push this instance's reviews back before it is stopped."""
        async with self._client(inst, read=300.0) as client:
            res = await client.post("/_sync")
            body = res.json() if res.status_code == 200 else {}
        if not body.get("ok"):
            # A full sync needs a human decision, so it cannot be resolved here.
            # The collection is on disk; the next session will ask.
            log.warning(
                "final sync for %s did not complete: %s",
                inst.username,
                body.get("last_outcome") or res.status_code,
            )

    async def stop(self, inst: Instance) -> None:
        proc = inst.proc
        if proc is None:
            return
        with contextlib.suppress(ProcessLookupError):
            proc.send_signal(signal.SIGTERM)
        try:
            await asyncio.wait_for(proc.wait(), TERM_GRACE_SECS)
        except asyncio.TimeoutError:
            log.warning("instance for %s ignored SIGTERM; killing", inst.username)
            with contextlib.suppress(ProcessLookupError):
                proc.kill()
            await proc.wait()


def build_app():
    children = Children()
    registry = InstanceRegistry(
        spawn=children.spawn,
        health=children.health,
        stop=children.stop,
        sync_out=children.sync_out,
        sync_in=children.sync_in,
        activity=children.activity,
    )
    app = create_app(registry=registry)

    @app.on_event("startup")
    async def _start_sweeper() -> None:
        SOCKET_DIR.mkdir(parents=True, exist_ok=True)

        async def sweep_forever() -> None:
            while True:
                await asyncio.sleep(SWEEP_INTERVAL)
                with contextlib.suppress(Exception):
                    await registry.sweep()

        app.state.sweeper = asyncio.create_task(sweep_forever())

    @app.on_event("shutdown")
    async def _stop_everything() -> None:
        app.state.sweeper.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await app.state.sweeper
        # Sync every live instance out before the box takes the service away.
        await registry.shutdown()

    return app


app = build_app()

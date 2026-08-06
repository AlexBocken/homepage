"""Lifecycle of the `anki --syncserver` child process.

The sync server builds its user list once, at startup, from `SYNC_USER1..N`
(`SimpleServerInner::new_from_env`) — there is no runtime API for adding an
account. So onboarding a user means respawning the server, and the bridge owns
that process rather than reaching for `systemctl` and a sudo rule.

Restarting is cheap but not free: requests in flight are cut. Two things keep
that from mattering much:

* `hkey = sha1("user:pass")` is derived from the env string, so a restart does
  **not** invalidate anyone's session. Clients see a network error and retry.
* A restart only happens on a user's *first ever* login, and the drain below
  waits for ongoing syncs to finish first.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import secrets
import shutil
from collections.abc import AsyncIterator, Mapping

import httpx

log = logging.getLogger("anki-bridge.supervisor")

ANKI_BIN = os.environ.get("ANKI_BIN", "anki")
UPSTREAM_HOST = os.environ.get("UPSTREAM_HOST", "127.0.0.1")
UPSTREAM_PORT = int(os.environ.get("UPSTREAM_PORT", "27701"))
STATE_DIR = os.environ.get("STATE_DIR", "/var/lib/anki-bridge")
SYNC_BASE = os.environ.get("SYNC_BASE", os.path.join(STATE_DIR, "sync"))
MAX_SYNC_PAYLOAD_MEGS = os.environ.get("MAX_SYNC_PAYLOAD_MEGS", "200")

# How long to let in-flight syncs finish before restarting anyway. A client that
# has wedged its connection must not be able to block provisioning forever.
DRAIN_TIMEOUT = float(os.environ.get("DRAIN_TIMEOUT", "60"))
# How long the freshly spawned server gets to answer /health.
HEALTH_TIMEOUT = float(os.environ.get("HEALTH_TIMEOUT", "30"))
TERM_GRACE = 10.0
# Placeholder account used only while nobody has ever logged in.
BOOTSTRAP_USER = "_bootstrap"


class Supervisor:
    """Owns the child process, and the gate that keeps restarts safe."""

    def __init__(
        self,
        *,
        anki_bin: str = ANKI_BIN,
        host: str = UPSTREAM_HOST,
        port: int = UPSTREAM_PORT,
        sync_base: str = SYNC_BASE,
        drain_timeout: float = DRAIN_TIMEOUT,
        health_timeout: float = HEALTH_TIMEOUT,
    ) -> None:
        self.anki_bin = anki_bin
        self.host = host
        self.port = port
        self.sync_base = sync_base
        self.drain_timeout = drain_timeout
        self.health_timeout = health_timeout

        self.upstream = f"http://{host}:{port}"

        self._proc: asyncio.subprocess.Process | None = None
        self._users: Mapping[str, str] = {}
        self._watchdog: asyncio.Task | None = None
        self._stopping = False

        # Held for the whole of a restart. Requests take it briefly on the way
        # in, so a restart in progress makes new work queue instead of hitting a
        # server that is going down.
        self._gate = asyncio.Lock()
        self._in_flight = 0
        self._idle = asyncio.Event()
        self._idle.set()

    # ------------------------------------------------------------ request gate

    @contextlib.asynccontextmanager
    async def track_request(self) -> AsyncIterator[None]:
        """Wrap a proxied request: wait out any restart, then count as in flight."""
        async with self._gate:
            self._in_flight += 1
            self._idle.clear()
        try:
            yield
        finally:
            self._in_flight -= 1
            if self._in_flight == 0:
                self._idle.set()

    @property
    def in_flight(self) -> int:
        return self._in_flight

    # -------------------------------------------------------------- lifecycle

    async def start(self, users: Mapping[str, str]) -> None:
        async with self._gate:
            await self._spawn(users)

    async def restart_with(self, users: Mapping[str, str]) -> None:
        """Drain, then respawn the server with a new user list."""
        async with self._gate:
            if self._in_flight:
                log.info("draining %d in-flight request(s) before restart", self._in_flight)
                try:
                    await asyncio.wait_for(self._idle.wait(), self.drain_timeout)
                except asyncio.TimeoutError:
                    log.warning(
                        "drain timed out with %d request(s) still open; "
                        "restarting anyway (clients will retry)",
                        self._in_flight,
                    )
            await self._terminate()
            await self._spawn(users)

    async def stop(self) -> None:
        self._stopping = True
        if self._watchdog is not None:
            self._watchdog.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._watchdog
            self._watchdog = None
        await self._terminate()

    @property
    def running(self) -> bool:
        return self._proc is not None and self._proc.returncode is None

    async def healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.upstream}/health")
            return res.status_code == 200
        except httpx.HTTPError:
            return False

    # ---------------------------------------------------------------- internals

    def build_env(self, users: Mapping[str, str]) -> dict[str, str]:
        """The child's environment.

        Built from scratch rather than inherited: a stale `SYNC_USER*` left in
        the bridge's own environment would land in the middle of the numbering
        and silently truncate the account list.

        With no accounts yet the server would refuse to start ("No users
        defined"), so a throwaway account holds the place. Its password is
        random and never handed out, so it is not a login anyone can use.
        """
        env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            # The launcher rejects a non-UTF-8 locale before it ever reaches the
            # sync server (aqt/__init__.py).
            "LANG": os.environ.get("LANG", "C.UTF-8"),
            "PYTHONUTF8": "1",
            "HOME": self.sync_base,
            "RUST_LOG": os.environ.get("RUST_LOG", "anki=info"),
            "SYNC_HOST": self.host,
            "SYNC_PORT": str(self.port),
            "SYNC_BASE": self.sync_base,
            "MAX_SYNC_PAYLOAD_MEGS": MAX_SYNC_PAYLOAD_MEGS,
        }
        if users:
            env.update(users)
        else:
            env["SYNC_USER1"] = f"{BOOTSTRAP_USER}:{secrets.token_urlsafe(32)}"
        return env

    def _clear_bootstrap_folder(self, users: Mapping[str, str]) -> None:
        """Drop the placeholder's data folder once real accounts exist.

        The server creates `SYNC_BASE/<name>` for every account it is given, so
        the very first start (with nobody registered yet) leaves a `_bootstrap`
        folder behind that nothing will ever use again. Harmless, but it looks
        like a real user to anyone reading the data directory.
        """
        if any(v.split(":", 1)[0] == BOOTSTRAP_USER for v in users.values()):
            return
        folder = os.path.join(self.sync_base, BOOTSTRAP_USER)
        if not os.path.isdir(folder):
            return
        # Guard against the (absurd but possible) real account of that name.
        if os.path.exists(os.path.join(folder, "collection.anki2")):
            return
        shutil.rmtree(folder, ignore_errors=True)

    async def _spawn(self, users: Mapping[str, str]) -> None:
        os.makedirs(self.sync_base, exist_ok=True)
        if users:
            self._clear_bootstrap_folder(users)
        self._users = dict(users)
        self._stopping = False
        env = self.build_env(users)
        log.info("starting sync server on %s:%d with %d account(s)", self.host, self.port, len(users))
        self._proc = await asyncio.create_subprocess_exec(
            self.anki_bin, "--syncserver", env=env
        )
        await self._wait_healthy()
        if self._watchdog is None or self._watchdog.done():
            self._watchdog = asyncio.create_task(self._watch())

    async def _wait_healthy(self) -> None:
        deadline = asyncio.get_running_loop().time() + self.health_timeout
        while asyncio.get_running_loop().time() < deadline:
            if self._proc is not None and self._proc.returncode is not None:
                raise RuntimeError(
                    f"sync server exited immediately (code {self._proc.returncode})"
                )
            if await self.healthy():
                return
            await asyncio.sleep(0.25)
        raise RuntimeError(f"sync server did not become healthy within {self.health_timeout}s")

    async def _terminate(self) -> None:
        proc = self._proc
        self._proc = None
        if proc is None or proc.returncode is not None:
            return
        proc.terminate()
        try:
            await asyncio.wait_for(proc.wait(), TERM_GRACE)
        except asyncio.TimeoutError:
            log.warning("sync server ignored SIGTERM; killing")
            proc.kill()
            await proc.wait()

    async def _watch(self) -> None:
        """Bring the server back if it dies on its own.

        systemd's `Restart=` covers the bridge, not its child — without this a
        crashed sync server would leave the bridge up and every sync failing.
        """
        while True:
            proc = self._proc
            if proc is None:
                await asyncio.sleep(0.5)
                continue
            code = await proc.wait()
            if self._stopping:
                return
            async with self._gate:
                # A deliberate restart terminates the child too. It replaces
                # `_proc` under the same gate, so a changed `_proc` means the
                # exit was intentional and already handled.
                if self._stopping or self._proc is not proc:
                    continue
                self._proc = None
                log.error("sync server exited unexpectedly (code %s); restarting", code)
                try:
                    await self._spawn(self._users)
                except Exception:
                    log.exception("could not restart sync server")
                    await asyncio.sleep(5)

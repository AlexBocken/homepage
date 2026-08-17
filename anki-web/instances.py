"""One `ankiweb` process per user, spawned on demand and reclaimed when idle.

Why processes rather than one app holding several collections: the reviewer runs
arbitrary user card templates through a Rust extension, and a panic there takes
down the process it is in. With one process that is everyone's session; with one
each it is one person's. Eviction also actually returns memory, which CPython
would not, and each child can carry its own memory ceiling.

Each child listens on its own unix socket, named after its owner, and nginx
routes to it directly:

    proxy_pass http://unix:/run/anki-web/$anki_user.sock:/;

That is verified to work, WebSocket upgrades included. It means this service is
not in the request path at all — it starts children and reclaims them, and
nothing more. Sockets rather than ports because the name *is* the routing: no
port pool, no allocation, no map for nginx to consult.

The shape is lifted from `anki-bridge/supervisor.py` — a lock around lifecycle
transitions, health-poll after spawn, terminate with a grace period before
killing — because that one is in production and has been debugged.

Everything that touches the outside world (spawning, health checks, the clock)
is injected, so the tests exercise the state machine rather than a process tree.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import re
import secrets
import time
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Awaitable, Callable

log = logging.getLogger("anki-web.instances")

#: Short on purpose. AF_UNIX paths are capped around 108 bytes, so this cannot
#: live under a long state directory — putting the sockets beside the
#: collections in /var/lib/anki-web/<user>/ would eventually exceed it.
SOCKET_DIR = Path(os.environ.get("ANKI_WEB_SOCKET_DIR", "/run/anki-web"))

MAX_INSTANCES = int(os.environ.get("ANKI_WEB_MAX_INSTANCES", "3"))
IDLE_EVICT_SECS = float(os.environ.get("ANKI_WEB_IDLE_EVICT", "1800"))
HEALTH_TIMEOUT_SECS = float(os.environ.get("ANKI_WEB_HEALTH_TIMEOUT", "30"))
TERM_GRACE_SECS = 15.0

#: A collection that reliably panics pylib would otherwise be respawned forever.
BACKOFF_SECS = (2.0, 8.0, 30.0)
MAX_CONSECUTIVE_FAILURES = 3

#: The username arrives in a header from the Authentik outpost and is used to
#: build a filesystem path. Anything outside this set is refused rather than
#: sanitised — a name with a slash in it is not a name we should be guessing at.
_SAFE_USERNAME = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class State(str, Enum):
    STARTING = "starting"
    READY = "ready"
    DEAD = "dead"


class InstanceError(Exception):
    pass


class CapacityError(InstanceError):
    """Every slot is busy with an active session. Better to say so than to evict
    someone mid-review to make room."""


def socket_path(username: str, directory: Path | None = None) -> Path:
    """Where this user's instance listens. Raises on anything path-shaped."""
    if not _SAFE_USERNAME.match(username) or set(username) <= {"."}:
        # The dot is allowed inside a name but a name made only of dots is a
        # directory entry, never a person.
        raise InstanceError(f"refusing to build a socket path from {username!r}")
    return (directory or SOCKET_DIR) / f"{username}.sock"


@dataclass
class Instance:
    username: str
    socket: Path
    key: str
    state: State = State.STARTING
    proc: object | None = None
    started_at: float = 0.0
    last_seen: float = 0.0
    failures: int = 0
    failed_at: float = 0.0


class InstanceRegistry:
    def __init__(
        self,
        *,
        spawn: Callable[[Instance], Awaitable[object]],
        health: Callable[[Instance], Awaitable[bool]],
        stop: Callable[[Instance], Awaitable[None]],
        sync_out: Callable[[Instance], Awaitable[None]] | None = None,
        # Called once a child is healthy, to pull the collection down before the
        # user sees it. Without this a new user gets an empty default deck and
        # no way to fill it.
        sync_in: Callable[[Instance], Awaitable[None]] | None = None,
        # Asks a child when it last served a request. With nginx talking to the
        # children directly, this service never sees their traffic, so idle has
        # to be pulled rather than counted here.
        activity: Callable[[Instance], Awaitable[float | None]] | None = None,
        now: Callable[[], float] = time.time,
        # Injected alongside `now` and not independently: a deadline measured on
        # one clock and waited out on another never expires.
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        socket_dir: Path | None = None,
        max_instances: int = MAX_INSTANCES,
        idle_evict: float = IDLE_EVICT_SECS,
    ) -> None:
        self._spawn = spawn
        self._health = health
        self._stop = stop
        # Called before a child is stopped, to push its reviews back to the sync
        # server. An eviction that silently dropped them would be indefensible.
        self._sync_out = sync_out
        self._sync_in = sync_in
        self._activity = activity
        self._now = now
        self._sleep = sleep
        self._socket_dir = socket_dir or SOCKET_DIR
        self._max = max_instances
        self._idle_evict = idle_evict
        self._instances: dict[str, Instance] = {}
        self._gate = asyncio.Lock()

    # ------------------------------------------------------------- inspection

    def get(self, username: str) -> Instance | None:
        return self._instances.get(username)

    def ready(self, username: str) -> Instance | None:
        inst = self._instances.get(username)
        return inst if inst is not None and inst.state is State.READY else None

    def __len__(self) -> int:
        return len(self._instances)

    # -------------------------------------------------------------- lifecycle

    async def ensure(self, username: str) -> Instance:
        """The running instance for a user, starting one if needed."""
        async with self._gate:
            existing = self._instances.get(username)
            if existing is not None and existing.state is State.READY:
                existing.last_seen = self._now()
                return existing

            if existing is not None and existing.state is State.STARTING:
                return existing

            if existing is not None and existing.state is State.DEAD:
                self._raise_if_circuit_open(existing)
                del self._instances[username]

            await self._make_room()
            return await self._start(username, carry_failures=existing.failures if existing else 0)

    def _raise_if_circuit_open(self, dead: Instance) -> None:
        if dead.failures >= MAX_CONSECUTIVE_FAILURES:
            raise InstanceError(
                f"{dead.username}'s study session has failed to start "
                f"{dead.failures} times; not retrying automatically"
            )
        wait = BACKOFF_SECS[min(dead.failures, len(BACKOFF_SECS)) - 1] if dead.failures else 0.0
        if self._now() - dead.failed_at < wait:
            raise InstanceError("still backing off from a failed start")

    async def _make_room(self) -> None:
        if len(self._instances) < self._max:
            return
        # Evict the least recently used *idle* instance. Never an active one:
        # someone mid-review losing their session so a newcomer can start is a
        # worse outcome than the newcomer waiting.
        await self._refresh_activity()
        idle = [
            i for i in self._instances.values()
            if self._now() - i.last_seen >= self._idle_evict or i.state is State.DEAD
        ]
        if not idle:
            raise CapacityError("all study sessions are in use")
        victim = min(idle, key=lambda i: i.last_seen)
        await self._retire(victim)

    async def _start(self, username: str, *, carry_failures: int = 0) -> Instance:
        inst = Instance(
            username=username,
            socket=socket_path(username, self._socket_dir),
            # Per instance, so reaching another user's collection over the
            # socket needs more than knowing the path.
            key=secrets.token_urlsafe(24),
            started_at=self._now(),
            last_seen=self._now(),
            failures=carry_failures,
        )
        self._instances[username] = inst

        # A socket file left by a crashed child would make the next start fail
        # to bind, and nginx would keep connecting to something dead.
        with contextlib.suppress(FileNotFoundError, OSError):
            inst.socket.unlink()

        try:
            inst.proc = await self._spawn(inst)
        except Exception:
            log.exception("spawning %s failed", username)
            self._mark_dead(inst)
            raise

        if not await self._await_health(inst):
            log.error("%s never became healthy", username)
            with contextlib.suppress(Exception):
                await self._stop(inst)
            self._mark_dead(inst)
            raise InstanceError(f"instance for {username} did not start")

        inst.state = State.READY
        inst.failures = 0

        if self._sync_in is not None:
            try:
                await self._sync_in(inst)
            except Exception:
                # A failed first sync is not a failed start: the session works,
                # it just shows what is on disk. Marking the instance dead here
                # would lock the user out of a UI that is running fine.
                log.exception("initial sync for %s failed; serving anyway", inst.username)

        return inst

    async def _await_health(self, inst: Instance) -> bool:
        deadline = self._now() + HEALTH_TIMEOUT_SECS
        while self._now() < deadline:
            with contextlib.suppress(Exception):
                if await self._health(inst):
                    return True
            await self._sleep(0.25)
        return False

    def _mark_dead(self, inst: Instance) -> None:
        inst.state = State.DEAD
        inst.failures += 1
        inst.failed_at = self._now()

    async def _refresh_activity(self) -> None:
        """Pull each child's own idea of when it last served a request."""
        if self._activity is None:
            return
        for inst in list(self._instances.values()):
            if inst.state is not State.READY:
                continue
            try:
                seen = await self._activity(inst)
            except Exception:
                # A child that will not answer is not evidence of idleness; it
                # is evidence of a sick child, which the health path handles.
                log.debug("activity probe failed for %s", inst.username)
                continue
            if seen is not None:
                inst.last_seen = max(inst.last_seen, seen)

    async def _retire(self, inst: Instance) -> None:
        """Push work back, then stop. Order matters — a stopped process cannot
        sync, and the reviews only exist in its collection until it does."""
        if self._sync_out is not None and inst.state is State.READY:
            try:
                await self._sync_out(inst)
            except Exception:
                # Losing the sync is bad, but refusing to ever stop is worse:
                # the collection is on disk and the next start will sync it.
                log.exception("final sync for %s failed; stopping anyway", inst.username)
        with contextlib.suppress(Exception):
            await self._stop(inst)
        with contextlib.suppress(FileNotFoundError, OSError):
            inst.socket.unlink()
        self._instances.pop(inst.username, None)

    async def retire(self, username: str) -> None:
        async with self._gate:
            inst = self._instances.get(username)
            if inst is not None:
                await self._retire(inst)

    async def sweep(self) -> list[str]:
        """Reclaim instances nobody is using. Returns who was retired."""
        async with self._gate:
            await self._refresh_activity()
            stale = [
                i for i in self._instances.values()
                if self._now() - i.last_seen >= self._idle_evict
            ]
            for inst in stale:
                log.info("evicting idle instance for %s", inst.username)
                await self._retire(inst)
            return [i.username for i in stale]

    async def shutdown(self) -> None:
        async with self._gate:
            for inst in list(self._instances.values()):
                await self._retire(inst)

    def mark_crashed(self, username: str) -> None:
        """A watchdog noticed the child exited on its own.

        Deliberately does not respawn. nginx will 502 and the `@start` hook
        brings it back under the backoff above — a blind respawn against a
        collection that reliably crashes pylib is an infinite loop that looks
        like a working service.
        """
        inst = self._instances.get(username)
        if inst is not None and inst.state is not State.DEAD:
            log.warning("instance for %s exited unexpectedly", username)
            self._mark_dead(inst)

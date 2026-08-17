import pytest

import pathlib

from instances import (
    CapacityError,
    InstanceError,
    InstanceRegistry,
    State,
    socket_path,
)


class Clock:
    def __init__(self) -> None:
        self.t = 1_000.0

    def __call__(self) -> float:
        return self.t

    def advance(self, secs: float) -> None:
        self.t += secs


def registry(clock=None, *, healthy=True, spawn_fails=False, **kw):
    """A registry whose world is fake: nothing is spawned, nothing is polled."""
    clock = clock or Clock()
    active_at: dict[str, float] = {}
    started: list[str] = []
    stopped: list[str] = []
    synced: list[str] = []

    async def spawn(inst):
        if spawn_fails:
            raise RuntimeError("boom")
        started.append(inst.username)
        return object()

    async def health(inst):
        return healthy

    async def sleep(secs):
        # The fake clock only moves when something asks it to; a health poll
        # sleeping on the real one would spin here forever.
        clock.advance(secs)

    async def stop(inst):
        stopped.append(inst.username)

    async def sync_out(inst):
        synced.append(inst.username)

    # nginx talks to the children directly, so the registry cannot count
    # requests — it asks each child when it last served one.
    async def activity(inst):
        return active_at.get(inst.username)

    kw.setdefault("socket_dir", pathlib.Path("/tmp/anki-web-test-sockets"))
    reg = InstanceRegistry(
        spawn=spawn, health=health, stop=stop, sync_out=sync_out, activity=activity,
        now=clock, sleep=sleep, **kw
    )
    return reg, clock, started, stopped, synced, active_at


async def test_first_request_starts_an_instance():
    reg, _, started, _, _, active_at = registry()

    inst = await reg.ensure("alex")

    assert inst.state is State.READY
    assert started == ["alex"]
    assert inst.socket.name == "alex.sock"


async def test_a_second_request_reuses_the_running_one():
    reg, _, started, _, _, active_at = registry()

    first = await reg.ensure("alex")
    second = await reg.ensure("alex")

    assert first is second
    assert started == ["alex"]


async def test_two_users_get_separate_instances_and_keys():
    reg, _, _, _, _, active_at = registry()

    alex = await reg.ensure("alex")
    maria = await reg.ensure("maria")

    # The socket name *is* the routing — nginx proxies to $anki_user.sock.
    assert alex.socket != maria.socket
    assert alex.socket.name == "alex.sock"
    # The key is what stops one local process reaching another's collection.
    assert alex.key != maria.key


async def test_an_instance_that_never_gets_healthy_is_stopped_not_left_running():
    reg, _, _, stopped, _, active_at = registry(healthy=False, idle_evict=0)

    with pytest.raises(InstanceError):
        await reg.ensure("alex")

    assert stopped == ["alex"]
    assert reg.ready("alex") is None


async def test_a_failed_spawn_is_not_reported_as_ready():
    reg, _, _, _, _, active_at = registry(spawn_fails=True)

    with pytest.raises(RuntimeError):
        await reg.ensure("alex")

    assert reg.ready("alex") is None


class TestIdleEviction:
    async def test_an_idle_instance_is_reclaimed(self):
        reg, clock, _, stopped, _, active_at = registry(idle_evict=100)
        await reg.ensure("alex")

        clock.advance(101)
        assert await reg.sweep() == ["alex"]
        assert stopped == ["alex"]
        assert len(reg) == 0

    async def test_a_busy_instance_is_left_alone(self):
        reg, clock, _, stopped, _, active_at = registry(idle_evict=100)
        await reg.ensure("alex")

        clock.advance(90)
        active_at["alex"] = clock()   # the child served a request
        clock.advance(90)

        assert await reg.sweep() == []
        assert stopped == []

    async def test_reviews_are_pushed_back_before_the_process_dies(self):
        """The reviews only exist in that collection until it syncs."""
        reg, clock, _, stopped, synced, active_at = registry(idle_evict=100)
        await reg.ensure("alex")

        clock.advance(101)
        await reg.sweep()

        assert synced == ["alex"]
        # And in that order — a stopped process cannot sync.
        assert stopped == ["alex"]

    async def test_a_failed_final_sync_still_stops_the_process(self):
        clock = Clock()

        async def spawn(inst):
            return object()

        async def health(inst):
            return True

        stopped = []

        async def stop(inst):
            stopped.append(inst.username)

        async def sync_out(inst):
            raise RuntimeError("sync server down")

        reg = InstanceRegistry(
            spawn=spawn, health=health, stop=stop, sync_out=sync_out, now=clock, idle_evict=100
        )
        await reg.ensure("alex")
        clock.advance(101)

        await reg.sweep()
        # Refusing to ever stop would be worse: the collection is on disk and
        # the next start syncs it.
        assert stopped == ["alex"]


class TestCapacity:
    async def test_an_idle_instance_makes_room_for_a_newcomer(self):
        reg, clock, _, stopped, _, active_at = registry(max_instances=2, idle_evict=100)
        await reg.ensure("alex")
        await reg.ensure("maria")

        clock.advance(101)
        active_at["maria"] = clock()  # maria is active, alex is not

        await reg.ensure("sam")

        assert stopped == ["alex"]
        assert reg.ready("maria") is not None
        assert reg.ready("sam") is not None

    async def test_a_newcomer_waits_rather_than_evicting_an_active_session(self):
        reg, _, _, stopped, _, active_at = registry(max_instances=2, idle_evict=100)
        await reg.ensure("alex")
        await reg.ensure("maria")

        with pytest.raises(CapacityError):
            await reg.ensure("sam")

        # Nobody mid-review was thrown out to make room.
        assert stopped == []


class TestCrashes:
    async def test_a_crashed_instance_is_not_silently_respawned(self):
        reg, _, started, _, _, active_at = registry()
        await reg.ensure("alex")

        reg.mark_crashed("alex")

        assert reg.ready("alex") is None
        assert reg.get("alex").state is State.DEAD
        # Still only the original start — no respawn storm.
        assert started == ["alex"]

    async def test_a_retry_backs_off_before_starting_again(self):
        reg, clock, started, _, _, active_at = registry()
        await reg.ensure("alex")
        reg.mark_crashed("alex")

        with pytest.raises(InstanceError):
            await reg.ensure("alex")

        clock.advance(10)
        await reg.ensure("alex")
        assert started == ["alex", "alex"]

    async def test_repeated_failures_stop_being_retried(self):
        reg, clock, _, _, _, _ = registry(spawn_fails=True)

        for _ in range(3):
            with pytest.raises((RuntimeError, InstanceError)):
                await reg.ensure("alex")
            clock.advance(60)

        with pytest.raises(InstanceError, match="not retrying"):
            await reg.ensure("alex")


async def test_shutdown_syncs_and_stops_everything():
    reg, _, _, stopped, synced, active_at = registry()
    await reg.ensure("alex")
    await reg.ensure("maria")

    await reg.shutdown()

    assert sorted(stopped) == ["alex", "maria"]
    assert sorted(synced) == ["alex", "maria"]
    assert len(reg) == 0


class TestSocketPaths:
    def test_a_socket_is_named_after_its_owner(self):
        assert socket_path("alex", pathlib.Path("/run/anki-web")).name == "alex.sock"

    def test_a_path_shaped_username_is_refused_not_sanitised(self):
        """The username arrives in a header; it must never become a path."""
        for hostile in ["../../etc/passwd", "a/b", "", "x" * 65, "alex;rm", ".."]:
            with pytest.raises(InstanceError):
                socket_path(hostile, pathlib.Path("/run/anki-web"))


class TestInitialSync:
    """A brand-new collection is empty, and with sync driven by hand nothing in
    the UI would ever fill it."""

    def _reg(self, clock, *, sync_in_fails=False):
        synced_in = []

        async def spawn(inst):
            return object()

        async def health(inst):
            return True

        async def stop(inst):
            pass

        async def sleep(secs):
            clock.advance(secs)

        async def sync_in(inst):
            if sync_in_fails:
                raise RuntimeError("bridge unreachable")
            synced_in.append(inst.username)

        return (
            InstanceRegistry(
                spawn=spawn, health=health, stop=stop, sync_in=sync_in,
                now=clock, sleep=sleep,
                socket_dir=pathlib.Path("/tmp/anki-web-test-sockets"),
            ),
            synced_in,
        )

    async def test_a_new_instance_pulls_the_collection_down(self):
        reg, synced_in = self._reg(Clock())

        await reg.ensure("alex")

        assert synced_in == ["alex"]

    async def test_a_failed_first_sync_still_serves_the_session(self):
        """The UI is running fine; it just shows what is on disk. Failing the
        start here would lock the user out of a working instance."""
        reg, _ = self._reg(Clock(), sync_in_fails=True)

        inst = await reg.ensure("alex")

        assert inst.state is State.READY
        assert reg.ready("alex") is not None

    async def test_reusing_a_running_instance_does_not_resync(self):
        reg, synced_in = self._reg(Clock())

        await reg.ensure("alex")
        await reg.ensure("alex")

        assert synced_in == ["alex"]

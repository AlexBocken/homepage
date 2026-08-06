"""Supervisor — child environment and the drain that makes restarts survivable.

No real process is spawned here; `_spawn`/`_terminate` are stubbed so the gate
and drain logic can be tested deterministically. The real spawn is covered by
test_integration.py.
"""

from __future__ import annotations

import asyncio

import pytest

from supervisor import Supervisor


@pytest.fixture
def sup(tmp_path, monkeypatch):
    s = Supervisor(sync_base=str(tmp_path / "sync"), drain_timeout=0.2, health_timeout=1.0)
    s.spawned: list[dict] = []
    s.terminated = 0

    async def fake_spawn(users):
        s.spawned.append(dict(users))
        s._users = dict(users)  # noqa: SLF001

    async def fake_terminate():
        s.terminated += 1

    monkeypatch.setattr(s, "_spawn", fake_spawn)
    monkeypatch.setattr(s, "_terminate", fake_terminate)
    return s


def test_build_env_carries_the_user_map(sup):
    env = sup.build_env({"SYNC_USER1": "alex:secret", "SYNC_USER2": "maria:secret"})
    assert env["SYNC_USER1"] == "alex:secret"
    assert env["SYNC_USER2"] == "maria:secret"
    assert env["SYNC_PORT"] == str(sup.port)
    assert env["SYNC_BASE"] == sup.sync_base


def test_build_env_bootstraps_when_nobody_has_logged_in(sup):
    """The server refuses to start with no users defined."""
    env = sup.build_env({})
    assert env["SYNC_USER1"].startswith("_bootstrap:")
    assert len(env["SYNC_USER1"].split(":", 1)[1]) >= 32


def test_build_env_ignores_inherited_sync_vars(sup, monkeypatch):
    """A stray SYNC_USER in the bridge's own env would truncate the list.

    The loop reading SYNC_USER{idx} stops at the first gap, so an inherited
    SYNC_USER2 landing between our accounts would hide every account after it.
    """
    monkeypatch.setenv("SYNC_USER2", "attacker:hunter2")
    monkeypatch.setenv("SYNC_USER9", "stale:stale")

    env = sup.build_env({"SYNC_USER1": "alex:secret"})
    assert env["SYNC_USER1"] == "alex:secret"
    assert "SYNC_USER2" not in env
    assert "SYNC_USER9" not in env


def test_bootstrap_folder_is_cleaned_up_once_real_accounts_exist(sup, tmp_path):
    """Otherwise `_bootstrap` sits in the data dir forever, looking like a user."""
    folder = tmp_path / "sync" / "_bootstrap"
    folder.mkdir(parents=True)
    (folder / "media.db").write_bytes(b"")

    sup._clear_bootstrap_folder({"SYNC_USER1": "alex:secret"})  # noqa: SLF001
    assert not folder.exists()


def test_bootstrap_folder_is_kept_while_it_is_still_in_use(sup, tmp_path):
    folder = tmp_path / "sync" / "_bootstrap"
    folder.mkdir(parents=True)

    sup._clear_bootstrap_folder({"SYNC_USER1": "_bootstrap:secret"})  # noqa: SLF001
    assert folder.exists()


def test_bootstrap_cleanup_never_deletes_a_collection(sup, tmp_path):
    """Paranoia: a real account could conceivably be named `_bootstrap`."""
    folder = tmp_path / "sync" / "_bootstrap"
    folder.mkdir(parents=True)
    (folder / "collection.anki2").write_bytes(b"not empty")

    sup._clear_bootstrap_folder({"SYNC_USER1": "alex:secret"})  # noqa: SLF001
    assert (folder / "collection.anki2").exists()


async def test_restart_waits_for_in_flight_requests(sup):
    await sup.start({})
    released = asyncio.Event()

    async def long_request():
        async with sup.track_request():
            await released.wait()

    task = asyncio.create_task(long_request())
    await asyncio.sleep(0)  # let it take the gate and register
    assert sup.in_flight == 1

    restart = asyncio.create_task(sup.restart_with({"SYNC_USER1": "alex:secret"}))
    await asyncio.sleep(0.05)
    assert sup.terminated == 0, "restarted while a sync was still running"

    released.set()
    await task
    await restart
    assert sup.terminated == 1
    assert sup.spawned[-1] == {"SYNC_USER1": "alex:secret"}


async def test_restart_proceeds_after_the_drain_timeout(sup):
    """A wedged connection must not block provisioning forever."""
    await sup.start({})
    stuck = asyncio.Event()

    async def wedged():
        async with sup.track_request():
            await stuck.wait()

    task = asyncio.create_task(wedged())
    await asyncio.sleep(0)

    await asyncio.wait_for(sup.restart_with({"SYNC_USER1": "alex:secret"}), timeout=2)
    assert sup.terminated == 1

    stuck.set()
    await task


async def test_requests_queue_behind_a_restart(sup):
    """New work must not reach a server that is going down."""
    await sup.start({})
    started = asyncio.Event()
    holding = asyncio.Event()

    async def slow_spawn(users):  # noqa: ARG001
        started.set()
        await holding.wait()
        sup.spawned.append(dict(users))

    sup._spawn = slow_spawn  # noqa: SLF001
    restart = asyncio.create_task(sup.restart_with({"SYNC_USER1": "alex:secret"}))
    await started.wait()

    entered = asyncio.Event()

    async def late_request():
        async with sup.track_request():
            entered.set()

    task = asyncio.create_task(late_request())
    await asyncio.sleep(0.05)
    assert not entered.is_set(), "request slipped through mid-restart"

    holding.set()
    await restart
    await task
    assert entered.is_set()

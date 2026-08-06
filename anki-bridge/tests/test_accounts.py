"""Account store — slot bookkeeping and the hkey derivation it depends on."""

from __future__ import annotations

import hashlib

import pytest

from accounts import LAST_SEEN_RESOLUTION_SECS, hkey_for


def test_hkey_matches_ankis_derive_hkey():
    """The load-bearing protocol assumption.

    Anki's `derive_hkey` is `hex(sha1(user_and_pass))` over the raw
    `SYNC_USER<n>` value. If this ever stops matching, clients get session keys
    the server does not recognise and every sync 403s.
    """
    assert hkey_for("alex", "hunter2") == hashlib.sha1(b"alex:hunter2").hexdigest()


def test_ensure_is_idempotent_and_reports_creation(store):
    first, created = store.ensure("alex")
    assert created is True

    again, created_again = store.ensure("alex")
    assert created_again is False
    assert again == first


def test_secret_is_random_per_user(store):
    alex, _ = store.ensure("alex")
    maria, _ = store.ensure("maria")
    assert alex.sync_secret != maria.sync_secret
    assert len(alex.sync_secret) >= 32


def test_slots_are_allocated_contiguously(store):
    for name in ("alex", "maria", "jo"):
        store.ensure(name)
    assert [a.slot for a in store.all()] == [1, 2, 3]


def test_render_env_matches_slots(store):
    alex, _ = store.ensure("alex")
    maria, _ = store.ensure("maria")
    assert store.render_env() == {
        "SYNC_USER1": f"alex:{alex.sync_secret}",
        "SYNC_USER2": f"maria:{maria.sync_secret}",
    }


def test_render_env_is_empty_before_anyone_logs_in(store):
    assert store.render_env() == {}


def test_delete_closes_the_slot_gap(store):
    """A gap would silently truncate the user list.

    `SimpleServerInner::new_from_env` stops at the first missing
    `SYNC_USER{idx}`, so a hole at slot 2 would drop slot 3 as well — that user
    would find their password no longer works, with nothing in the logs.
    """
    for name in ("alex", "maria", "jo"):
        store.ensure(name)
    store.delete("maria")

    assert [(a.username, a.slot) for a in store.all()] == [("alex", 1), ("jo", 2)]
    assert sorted(store.render_env()) == ["SYNC_USER1", "SYNC_USER2"]


def test_render_env_refuses_a_gap(store):
    store.ensure("alex")
    store.ensure("maria")
    # Force the corruption a bug elsewhere could introduce.
    with store._lock:  # noqa: SLF001
        store._db.execute("UPDATE accounts SET slot = 5 WHERE username = 'maria'")  # noqa: SLF001
        store._db.commit()  # noqa: SLF001

    with pytest.raises(RuntimeError, match="non-contiguous"):
        store.render_env()


def test_new_user_reuses_a_freed_slot(store):
    store.ensure("alex")
    store.ensure("maria")
    store.delete("alex")
    jo, _ = store.ensure("jo")
    assert [a.slot for a in store.all()] == [1, 2]
    assert jo.slot == 2


def test_by_hkey_round_trip(store):
    alex, _ = store.ensure("alex")
    found = store.by_hkey(alex.hkey)
    assert found is not None and found.username == "alex"
    assert store.by_hkey("nope") is None


def test_rotate_invalidates_the_old_key(store):
    alex, _ = store.ensure("alex")
    rotated = store.rotate("alex")

    assert rotated.sync_secret != alex.sync_secret
    assert rotated.hkey != alex.hkey
    assert store.by_hkey(alex.hkey) is None
    assert store.by_hkey(rotated.hkey) is not None


def test_rotate_unknown_user_raises(store):
    with pytest.raises(KeyError):
        store.rotate("nobody")


def test_touch_is_coalesced(store):
    """One write per user per resolution window, not one per sync request."""
    store.ensure("alex")

    store.touch("alex", monotonic=1000.0)
    first = store.get("alex").last_seen
    assert first is not None

    store.touch("alex", monotonic=1000.0 + LAST_SEEN_RESOLUTION_SECS - 1)
    assert store.get("alex").last_seen == first

    store.touch("alex", monotonic=1000.0 + LAST_SEEN_RESOLUTION_SECS + 1)
    # Same timestamp string is possible within a second; what matters is that
    # the write was attempted, tracked by the in-memory marker.
    assert store._last_seen_written["alex"] > 1000.0  # noqa: SLF001


def test_state_survives_reopening(store, tmp_path):
    from accounts import AccountStore

    alex, _ = store.ensure("alex")
    store.close()

    reopened = AccountStore(str(tmp_path / "accounts.db"))
    try:
        assert reopened.get("alex") == alex
    finally:
        reopened.close()

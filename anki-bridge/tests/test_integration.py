"""Protocol assumptions, checked against a real `anki --syncserver`.

Everything else in this suite mocks the sync server, which means it can only
confirm the bridge is self-consistent. These tests confirm it agrees with Anki:

* the session key really is `sha1("user:pass")` — the bridge hands clients a key
  minted from a credential pair it composed, and
* a restart really does preserve it — which is what makes "add a user, respawn"
  an acceptable thing to do to everyone else's session.

Skipped when `anki` is not installed.
"""

from __future__ import annotations

import json
import shutil
import socket

import httpx
import pytest
import zstandard

from accounts import AccountStore
from supervisor import Supervisor

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(shutil.which("anki") is None, reason="anki is not installed"),
]

SYNC_HEADER = json.dumps({"v": 11, "k": "", "c": "anki,26.08,linux", "s": "testskey"})


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def zstd(payload: dict) -> bytes:
    return zstandard.ZstdCompressor().compress(json.dumps(payload).encode())


def unzstd(body: bytes) -> dict:
    return json.loads(zstandard.ZstdDecompressor().decompressobj().decompress(body))


async def post(url: str, payload: dict, hkey: str = "") -> httpx.Response:
    header = json.dumps({"v": 11, "k": hkey, "c": "anki,26.08,linux", "s": "testskey"})
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.post(url, content=zstd(payload), headers={"anki-sync": header})


@pytest.fixture
async def live(tmp_path):
    """A real sync server, driven by a real account store."""
    store = AccountStore(str(tmp_path / "accounts.db"))
    sup = Supervisor(sync_base=str(tmp_path / "sync"), port=free_port(), health_timeout=60.0)
    await sup.start(store.render_env())
    try:
        yield store, sup
    finally:
        await sup.stop()
        store.close()


async def test_server_starts_with_no_accounts(live):
    """Before anyone has ever logged in there are no users to define."""
    _, sup = live
    assert await sup.healthy() is True


async def test_generated_credentials_authenticate(live):
    store, sup = live
    account, _ = store.ensure("alex")
    await sup.restart_with(store.render_env())

    res = await post(f"{sup.upstream}/sync/hostKey", {"u": "alex", "p": account.sync_secret})
    assert res.status_code == 200


async def test_session_key_is_sha1_of_the_env_string(live):
    """`hkey_for` must agree with Anki's `derive_hkey`, or nothing works."""
    store, sup = live
    account, _ = store.ensure("alex")
    await sup.restart_with(store.render_env())

    res = await post(f"{sup.upstream}/sync/hostKey", {"u": "alex", "p": account.sync_secret})
    assert unzstd(res.content)["key"] == account.hkey


async def test_wrong_password_is_refused_by_the_server(live):
    store, sup = live
    store.ensure("alex")
    await sup.restart_with(store.render_env())

    res = await post(f"{sup.upstream}/sync/hostKey", {"u": "alex", "p": "not-the-secret"})
    assert res.status_code == 403


async def test_adding_a_user_keeps_everyone_else_logged_in(live):
    """The whole reason a restart is acceptable.

    A 403 here would mean every existing client has to log in again whenever
    someone new joins. We assert *not 403*: the request body is deliberately not
    a valid Meta payload, so the server may well reject it — but only after
    accepting the session key.
    """
    store, sup = live
    alex, _ = store.ensure("alex")
    await sup.restart_with(store.render_env())

    store.ensure("maria")
    await sup.restart_with(store.render_env())

    res = await post(f"{sup.upstream}/sync/meta", {"v": 11, "cv": "anki,26.08,linux"}, hkey=alex.hkey)
    assert res.status_code != 403

    # And the key still is what the client was handed originally.
    again = await post(f"{sup.upstream}/sync/hostKey", {"u": "alex", "p": alex.sync_secret})
    assert unzstd(again.content)["key"] == alex.hkey


async def test_stale_key_is_rejected_after_rotation(live):
    """`rotate()` is the revocation primitive; prove it actually revokes."""
    store, sup = live
    alex, _ = store.ensure("alex")
    await sup.restart_with(store.render_env())

    rotated = store.rotate("alex")
    await sup.restart_with(store.render_env())

    res = await post(f"{sup.upstream}/sync/meta", {"v": 11, "cv": "anki,26.08,linux"}, hkey=alex.hkey)
    assert res.status_code == 403
    assert rotated.hkey != alex.hkey


async def test_each_user_gets_their_own_collection_folder(live, tmp_path):
    store, sup = live
    store.ensure("alex")
    store.ensure("maria")
    await sup.restart_with(store.render_env())

    sync_base = tmp_path / "sync"
    assert (sync_base / "alex").is_dir()
    assert (sync_base / "maria").is_dir()
    # The placeholder from the empty first start does not linger.
    assert not (sync_base / "_bootstrap").exists()

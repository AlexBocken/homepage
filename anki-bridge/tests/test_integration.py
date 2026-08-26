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

import asyncio
import json
import os
import shutil
import socket
import sqlite3

import httpx
import pytest
import uvicorn
import zstandard

import app as service
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


# --------------------------------------------------------------- through the bridge


class AllowEveryone:
    """Stands in for the Authentik group gate, which these tests are not about."""

    group = "anki_users"

    async def is_authorized(self, username, *, now=None):  # noqa: ARG002
        return True


def bloat(path: str, megabytes: int) -> None:
    """Grow a collection to something worth streaming.

    Random bytes, so zstd cannot compress the download back down to nothing, and
    a table of its own rather than the Anki library just to add notes: the size
    is the only thing under test.
    """
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE IF NOT EXISTS bulk (id INTEGER PRIMARY KEY, blob BLOB)")
    for _ in range(megabytes * 4):
        con.execute("INSERT INTO bulk (blob) VALUES (?)", (os.urandom(256 * 1024),))
    con.commit()
    con.close()


@pytest.fixture
async def bridged(tmp_path, monkeypatch):
    """The real proxy, serving a real sync server, over a real socket.

    `TestClient` would not do: this is about what goes onto the wire between the
    two, which an in-process ASGI transport never puts there.
    """
    b = service.Bridge.__new__(service.Bridge)
    b.accounts = AccountStore(str(tmp_path / "accounts.db"))
    b.supervisor = Supervisor(sync_base=str(tmp_path / "sync"), port=free_port(), health_timeout=60.0)
    b.groups = AllowEveryone()
    b.client = httpx.AsyncClient(timeout=service.PROXY_TIMEOUT)
    # The lifespan handler builds one of these itself; it is turned off below so
    # that this one — pointed at a port nothing else is using — is what serves.
    monkeypatch.setattr(service, "bridge", b, raising=False)

    account, _ = b.accounts.ensure("alex")
    await b.supervisor.start(b.accounts.render_env())

    port = free_port()
    server = uvicorn.Server(
        uvicorn.Config(service.app, host="127.0.0.1", port=port, log_level="warning", lifespan="off")
    )
    serving = asyncio.create_task(server.serve())
    while not server.started:
        await asyncio.sleep(0.05)

    try:
        yield f"http://127.0.0.1:{port}", account, b
    finally:
        server.should_exit = True
        await serving
        await b.supervisor.stop()
        await b.client.aclose()
        b.accounts.close()


async def test_a_large_download_arrives_whole(bridged, tmp_path):
    """The bug that made full syncs from AnkiDroid fail.

    Forwarding the request body as a stream made httpx frame it
    `Transfer-Encoding: chunked`, and Anki's sync server answers a chunked
    request by resetting the connection part way through its own response. Small
    replies are already buffered in the socket by then and survive, so only the
    two endpoints with big ones — `/sync/download` and `/msync/downloadFiles` —
    ever showed it, as an unexplained broken stream on the client and a
    `ReadError` here.

    The reset is a race, so this repeats — one download completing proves
    nothing. The deterministic guard is in `test_proxy.py`, which asserts the
    header itself; this is here to show the header is the thing that matters.
    """
    base, account, b = bridged

    await b.supervisor.stop()
    bloat(str(tmp_path / "sync" / "alex" / "collection.anki2"), megabytes=64)
    await b.supervisor.start(b.accounts.render_env())

    header = json.dumps({"v": 11, "k": account.hkey, "c": "anki,26.08,linux", "s": "dl"})
    async with httpx.AsyncClient(timeout=120.0) as client:
        for _ in range(12):
            async with client.stream(
                "POST", f"{base}/sync/download", content=zstd({}), headers={"anki-sync": header}
            ) as res:
                assert res.status_code == 200
                original = int(res.headers["anki-original-size"])
                # Decompressed rather than counted: the point is that every byte
                # of the collection got here, not that the transfer looked long
                # enough.
                unpacked = zstandard.ZstdDecompressor().decompressobj()
                received = 0
                async for chunk in res.aiter_raw():
                    received += len(unpacked.decompress(chunk))
            assert received == original

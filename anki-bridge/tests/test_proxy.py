"""The HTTP surface: credential swap on /sync/hostKey, pass-through for the rest.

A stub upstream stands in for the sync server so these tests can assert on
exactly what the bridge sends it — above all that the user's real password never
gets there.
"""

from __future__ import annotations

import contextlib
import json

import httpx
import pytest
import zstandard
from fastapi.testclient import TestClient

import app as service
from accounts import AccountStore, hkey_for


class FakeSupervisor:
    def __init__(self, sync_base: str):
        self.upstream = "http://sync-server.test"
        self.sync_base = sync_base
        self.in_flight = 0
        self.peak_in_flight = 0
        self.running = True
        self.restarts: list[dict] = []

    @contextlib.asynccontextmanager
    async def track_request(self):
        self.in_flight += 1
        self.peak_in_flight = max(self.peak_in_flight, self.in_flight)
        try:
            yield
        finally:
            self.in_flight -= 1

    async def restart_with(self, users):
        self.restarts.append(dict(users))

    async def healthy(self):
        return True


async def _stream(data: bytes):
    """Response bodies must be streamable — the bridge never buffers them."""
    yield data


class Upstream:
    """Records what the bridge forwards, and replies as the sync server would."""

    def __init__(self):
        self.requests: list[httpx.Request] = []
        self.status = 200

    def __call__(self, request: httpx.Request) -> httpx.Response:
        # MockTransport has already awaited the request body for us.
        self.requests.append(request)
        if request.url.path == "/sync/hostKey":
            body = json.loads(zstandard.ZstdDecompressor().decompressobj().decompress(request.content))
            key = hkey_for(body["u"], body["p"])
            return httpx.Response(
                self.status,
                content=_stream(
                    zstandard.ZstdCompressor().compress(json.dumps({"key": key}).encode())
                ),
                headers={"content-type": "application/json"},
            )
        return httpx.Response(self.status, content=_stream(b"upstream-said-ok"))

    @property
    def last(self) -> httpx.Request:
        return self.requests[-1]

    def hostkey_payload(self) -> dict:
        return json.loads(
            zstandard.ZstdDecompressor().decompressobj().decompress(self.last.content)
        )


class FakeGate:
    def __init__(self, allowed: set[str]):
        self.allowed = allowed
        self.group = "anki_users"
        self.error: Exception | None = None

    async def is_authorized(self, username, *, now=None):  # noqa: ARG002
        if self.error is not None:
            raise self.error
        return username in self.allowed


@pytest.fixture
def bridge(tmp_path, monkeypatch):
    """A wired-up bridge with a stub upstream, without booting a sync server."""
    b = service.Bridge.__new__(service.Bridge)
    b.accounts = AccountStore(str(tmp_path / "accounts.db"))
    b.supervisor = FakeSupervisor(str(tmp_path / "sync"))
    b.groups = FakeGate({"alex", "maria"})
    b.upstream = Upstream()
    b.client = httpx.AsyncClient(transport=httpx.MockTransport(b.upstream))

    b.passwords = {"alex": "hunter2", "maria": "correcthorse"}
    b.users = {
        "alex": {"username": "alex", "email": "Alex@Example.org", "is_active": True},
        "maria": {"username": "maria", "email": "maria@example.org", "is_active": True},
    }

    async def fake_resolve(identifier):
        for user in b.users.values():
            if user["username"] == identifier:
                return user
            if (user.get("email") or "").casefold() == identifier.casefold():
                return user
        return None

    async def fake_verify(identifier, password):
        # Authentik's flow accepts whatever its identification stage accepts, so
        # the stub takes either form too.
        user = await fake_resolve(identifier)
        return user is not None and b.passwords.get(user["username"]) == password

    monkeypatch.setattr(service, "resolve_user", fake_resolve)
    monkeypatch.setattr(service, "verify_password", fake_verify)
    # `bridge` is only annotated at module level; the real one is built by the
    # lifespan handler, which these tests deliberately skip.
    monkeypatch.setattr(service, "bridge", b, raising=False)
    yield b
    b.accounts.close()


@pytest.fixture
def client(bridge):  # noqa: ARG001
    return TestClient(service.app)


def hostkey_body(username: str, password: str) -> bytes:
    return zstandard.ZstdCompressor().compress(
        json.dumps({"u": username, "p": password}).encode()
    )


SYNC_HEADER = json.dumps({"v": 11, "k": "", "c": "anki,26.08", "s": "abc"})


# ------------------------------------------------------------------ hostKey


def test_login_swaps_in_the_managed_account(client, bridge):
    res = client.post(
        "/sync/hostKey",
        content=hostkey_body("alex", "hunter2"),
        headers={"anki-sync": SYNC_HEADER},
    )
    assert res.status_code == 200

    account = bridge.accounts.get("alex")
    forwarded = bridge.upstream.hostkey_payload()
    assert forwarded == {"u": "alex", "p": account.sync_secret}
    assert "hunter2" not in json.dumps(forwarded), "real password reached the sync server"


def test_login_returns_the_upstream_key_unchanged(client, bridge):
    res = client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    account = bridge.accounts.get("alex")
    key = json.loads(zstandard.ZstdDecompressor().decompressobj().decompress(res.content))["key"]
    assert key == account.hkey


def test_first_login_provisions_and_restarts(client, bridge):
    client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    assert bridge.accounts.get("alex") is not None
    assert bridge.supervisor.restarts == [{"SYNC_USER1": f"alex:{bridge.accounts.get('alex').sync_secret}"}]


def test_second_login_does_not_restart(client, bridge):
    client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    assert len(bridge.supervisor.restarts) == 1


def test_each_user_gets_their_own_slot(client, bridge):
    client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    client.post("/sync/hostKey", content=hostkey_body("maria", "correcthorse"))
    assert sorted(bridge.accounts.render_env()) == ["SYNC_USER1", "SYNC_USER2"]
    assert len(bridge.supervisor.restarts) == 2


def test_wrong_password_never_reaches_upstream(client, bridge):
    res = client.post("/sync/hostKey", content=hostkey_body("alex", "wrong"))
    assert res.status_code == 403
    assert bridge.upstream.requests == []
    assert bridge.accounts.get("alex") is None, "a failed login provisioned an account"


def test_user_without_the_group_is_refused(client, bridge):
    bridge.passwords["jo"] = "letmein"
    bridge.users["jo"] = {"username": "jo", "email": "jo@example.org", "is_active": True}
    res = client.post("/sync/hostKey", content=hostkey_body("jo", "letmein"))
    assert res.status_code == 403
    assert bridge.upstream.requests == []
    assert bridge.accounts.get("jo") is None


def test_email_login_lands_on_the_same_account_as_username_login(client, bridge):
    """The whole point of canonicalising.

    Provisioning on the raw input would give one person two sync accounts and
    two collections, which then silently drift apart.
    """
    client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    first = bridge.accounts.get("alex")

    res = client.post("/sync/hostKey", content=hostkey_body("Alex@Example.org", "hunter2"))
    assert res.status_code == 200

    assert [a.username for a in bridge.accounts.all()] == ["alex"]
    assert bridge.accounts.get("alex").sync_secret == first.sync_secret
    assert len(bridge.supervisor.restarts) == 1, "email login provisioned a second account"


def test_email_login_is_case_insensitive(client, bridge):
    res = client.post("/sync/hostKey", content=hostkey_body("ALEX@EXAMPLE.ORG", "hunter2"))
    assert res.status_code == 200
    assert [a.username for a in bridge.accounts.all()] == ["alex"]


def test_email_login_returns_the_key_for_the_canonical_account(client, bridge):
    res = client.post("/sync/hostKey", content=hostkey_body("alex@example.org", "hunter2"))
    key = json.loads(zstandard.ZstdDecompressor().decompressobj().decompress(res.content))["key"]
    assert key == bridge.accounts.get("alex").hkey


def test_unknown_identifier_never_reaches_upstream(client, bridge):
    res = client.post("/sync/hostKey", content=hostkey_body("nobody@example.org", "whatever"))
    assert res.status_code == 403
    assert bridge.upstream.requests == []
    assert bridge.accounts.all() == []


def test_authentik_outage_is_a_503_not_a_denial(client, bridge):
    """Anki treats 403 as "wrong password"; an outage must not say that."""
    from authentik import AuthentikError

    bridge.groups.error = AuthentikError("down")
    res = client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    assert res.status_code == 503


def test_undrivable_flow_reports_501(client, bridge):
    from authentik import UnsupportedFlowError

    bridge.groups.error = UnsupportedFlowError("captcha")
    res = client.post("/sync/hostKey", content=hostkey_body("alex", "hunter2"))
    assert res.status_code == 501


def test_uncompressed_body_is_accepted(client, bridge):
    """Defensive fallback for a client that doesn't zstd its login."""
    res = client.post(
        "/sync/hostKey", content=json.dumps({"u": "alex", "p": "hunter2"}).encode()
    )
    assert res.status_code == 200
    assert bridge.accounts.get("alex") is not None


def test_garbage_body_is_a_400(client, bridge):
    res = client.post("/sync/hostKey", content=b"\x00not json at all")
    assert res.status_code == 400
    assert bridge.upstream.requests == []


def test_sync_header_is_forwarded_verbatim(client, bridge):
    client.post(
        "/sync/hostKey",
        content=hostkey_body("alex", "hunter2"),
        headers={"anki-sync": SYNC_HEADER},
    )
    assert bridge.upstream.last.headers["anki-sync"] == SYNC_HEADER


# -------------------------------------------------------------- pass-through


def _provision(client, bridge, username="alex"):
    client.post("/sync/hostKey", content=hostkey_body(username, bridge.passwords[username]))
    return bridge.accounts.get(username)


def test_collection_requests_stream_through(client, bridge):
    account = _provision(client, bridge)
    header = json.dumps({"v": 11, "k": account.hkey, "c": "anki,26.08", "s": "s"})

    res = client.post("/sync/meta", content=b"payload", headers={"anki-sync": header})
    assert res.status_code == 200
    assert res.content == b"upstream-said-ok"
    assert bridge.upstream.last.url.path == "/sync/meta"
    assert bridge.upstream.last.content == b"payload"


def test_media_begin_keeps_its_query_string(client, bridge):
    """`GET /msync/begin` carries the key as `?k=`, not in the header."""
    account = _provision(client, bridge)

    res = client.get(f"/msync/begin?k={account.hkey}&v=anki%2C26.08")
    assert res.status_code == 200
    assert bridge.upstream.last.url.query == f"k={account.hkey}&v=anki%2C26.08".encode()


def test_revoked_user_is_cut_off_mid_session(client, bridge):
    """Session keys never expire, so the group re-check is the only revocation."""
    account = _provision(client, bridge)
    header = json.dumps({"v": 11, "k": account.hkey, "c": "anki,26.08", "s": "s"})
    bridge.groups.allowed.discard("alex")

    before = len(bridge.upstream.requests)
    res = client.post("/sync/meta", content=b"payload", headers={"anki-sync": header})
    assert res.status_code == 403
    assert len(bridge.upstream.requests) == before, "request reached upstream anyway"


def test_unknown_key_is_left_to_the_sync_server(client, bridge):
    """We only recognise keys we issued; upstream rejects the rest."""
    bridge.upstream.status = 403
    header = json.dumps({"v": 11, "k": "deadbeef", "c": "anki,26.08", "s": "s"})
    res = client.post("/sync/meta", content=b"x", headers={"anki-sync": header})
    assert res.status_code == 403
    assert bridge.upstream.last.url.path == "/sync/meta"


def test_group_outage_does_not_break_a_live_sync(client, bridge):
    """Stale-but-authorized beats cutting off an in-progress sync."""
    from authentik import AuthentikError

    account = _provision(client, bridge)
    header = json.dumps({"v": 11, "k": account.hkey, "c": "anki,26.08", "s": "s"})
    bridge.groups.error = AuthentikError("down")

    res = client.post("/sync/meta", content=b"x", headers={"anki-sync": header})
    assert res.status_code == 200


def test_proxied_requests_are_counted_in_flight(client, bridge):
    """The drain before a restart depends on this count being right."""
    account = _provision(client, bridge)
    header = json.dumps({"v": 11, "k": account.hkey, "c": "anki,26.08", "s": "s"})

    client.post("/sync/meta", content=b"x", headers={"anki-sync": header})
    assert bridge.supervisor.peak_in_flight >= 1
    assert bridge.supervisor.in_flight == 0, "in-flight count leaked"


def test_activity_is_recorded(client, bridge):
    account = _provision(client, bridge)
    header = json.dumps({"v": 11, "k": account.hkey, "c": "anki,26.08", "s": "s"})

    client.post("/sync/meta", content=b"x", headers={"anki-sync": header})
    assert bridge.accounts.get("alex").last_seen is not None


# ------------------------------------------------------------------ internal


def test_status_requires_the_token(client, bridge):
    _provision(client, bridge)
    assert client.get("/internal/status?username=alex").status_code == 403
    assert (
        client.get("/internal/status?username=alex", headers={"x-bridge-token": "wrong"}).status_code
        == 403
    )


def test_status_reports_provisioning(client, bridge):
    ok = {"x-bridge-token": "test-bridge-token"}

    res = client.get("/internal/status?username=alex", headers=ok)
    assert res.json()["provisioned"] is False

    _provision(client, bridge)
    body = client.get("/internal/status?username=alex", headers=ok).json()
    assert body["provisioned"] is True
    assert body["sync_url"] == "https://anki.example.org/"
    assert body["username"] == "alex"


def test_status_never_exposes_the_secret(client, bridge):
    _provision(client, bridge)
    body = client.get(
        "/internal/status?username=alex", headers={"x-bridge-token": "test-bridge-token"}
    ).json()
    account = bridge.accounts.get("alex")
    assert account.sync_secret not in json.dumps(body)
    assert account.hkey not in json.dumps(body)

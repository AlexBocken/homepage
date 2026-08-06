"""Authentik client — the flow-executor state machine and the group gate.

Authentik has no "check this password" endpoint, so `verify_password` drives the
real login flow and reads the outcome off which stage comes back. These tests
pin that reading, because getting it backwards would either let everyone in or
lock everyone out.
"""

from __future__ import annotations

import httpx
import pytest

import authentik
from authentik import AuthentikError, GroupGate, UnsupportedFlowError, verify_password


class _Transport:
    """Serves a scripted sequence of JSON stage responses."""

    def __init__(self, stages: list[dict], status: int = 200):
        self.stages = list(stages)
        self.status = status
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        stage = self.stages.pop(0) if self.stages else {}
        return httpx.Response(self.status, json=stage)


class _Shim:
    """Stands in for the `httpx` module inside `authentik`."""

    HTTPError = httpx.HTTPError

    def __init__(self, handler):
        self._handler = handler

    def AsyncClient(self, **kwargs):  # noqa: N802 — mirrors httpx's name
        kwargs.pop("transport", None)
        return httpx.AsyncClient(transport=httpx.MockTransport(self._handler), **kwargs)


@pytest.fixture
def flow(monkeypatch):
    def install(stages, status=200):
        transport = _Transport(stages, status)
        monkeypatch.setattr(authentik, "httpx", _Shim(transport))
        return transport

    return install


IDENT = {"component": "ak-stage-identification"}
IDENT_WITH_PASSWORD = {"component": "ak-stage-identification", "password_fields": True}
PASSWORD = {"component": "ak-stage-password"}
SUCCESS = {"component": "xak-flow-redirect", "to": "/"}


async def test_split_identification_then_password_accepted(flow):
    transport = flow([IDENT, PASSWORD, SUCCESS])
    assert await verify_password("alex", "hunter2") is True

    # GET to start, POST the username, POST the password.
    assert [r.method for r in transport.requests] == ["GET", "POST", "POST"]
    assert b"uid_field" in transport.requests[1].content
    assert b"hunter2" in transport.requests[2].content


async def test_combined_stage_sends_both_at_once(flow):
    transport = flow([IDENT_WITH_PASSWORD, SUCCESS])
    assert await verify_password("alex", "hunter2") is True

    body = transport.requests[1].content
    assert b"uid_field" in body and b"hunter2" in body


async def test_password_stage_repeated_means_rejected(flow):
    """Authentik re-presents the credential stage instead of erroring."""
    flow([IDENT, PASSWORD, PASSWORD])
    assert await verify_password("alex", "wrong") is False


async def test_identification_stage_repeated_means_rejected(flow):
    flow([IDENT_WITH_PASSWORD, IDENT_WITH_PASSWORD])
    assert await verify_password("alex", "wrong") is False


async def test_captcha_or_unknown_stage_is_not_silently_treated_as_success(flow):
    """Fail loudly: a stage we cannot drive must never read as authenticated."""
    flow([{"component": "ak-stage-captcha"}])
    with pytest.raises(UnsupportedFlowError):
        await verify_password("alex", "hunter2")


async def test_flow_start_failure_raises(flow):
    flow([{}], status=500)
    with pytest.raises(AuthentikError):
        await verify_password("alex", "hunter2")


# ------------------------------------------------------------------- groups


def _users_transport(payload, status=200):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json=payload)

    return handler


async def test_resolve_user_by_username(monkeypatch):
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(_users_transport({"results": [{"username": "alex", "email": "alex@example.org"}]})),
    )
    user = await authentik.resolve_user("alex")
    assert user is not None and user["username"] == "alex"


async def test_resolve_user_by_email(monkeypatch):
    """People type their email into Anki as often as their username."""
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(_users_transport({"results": [{"username": "alex", "email": "alex@example.org"}]})),
    )
    user = await authentik.resolve_user("alex@example.org")
    assert user is not None and user["username"] == "alex"


async def test_resolve_user_by_email_ignores_case(monkeypatch):
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(_users_transport({"results": [{"username": "alex", "email": "Alex@Example.org"}]})),
    )
    user = await authentik.resolve_user("ALEX@EXAMPLE.ORG")
    assert user is not None and user["username"] == "alex"


async def test_resolve_user_refuses_an_ambiguous_email(monkeypatch):
    """Authentik does not enforce unique emails; guessing hands over the wrong
    person's collection."""
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(
            _users_transport(
                {
                    "results": [
                        {"username": "alex", "email": "shared@example.org"},
                        {"username": "alexander", "email": "shared@example.org"},
                    ]
                }
            )
        ),
    )
    with pytest.raises(AuthentikError):
        await authentik.resolve_user("shared@example.org")


async def test_resolve_user_returns_none_for_a_stranger(monkeypatch):
    monkeypatch.setattr(authentik, "httpx", _Shim(_users_transport({"results": []})))
    assert await authentik.resolve_user("nobody") is None
    assert await authentik.resolve_user("nobody@example.org") is None


async def test_resolve_user_does_not_match_a_username_against_an_email(monkeypatch):
    """A bare word must not fall through to the email branch and fuzzy-match."""
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(_users_transport({"results": [{"username": "alexander", "email": "alex@example.org"}]})),
    )
    assert await authentik.resolve_user("alex") is None


async def test_get_groups_reads_group_names(monkeypatch):
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(
            _users_transport(
                {"results": [{"username": "alex", "is_active": True, "groups_obj": [{"name": "anki_users"}]}]}
            )
        ),
    )
    assert await authentik.get_groups("alex") == ["anki_users"]


async def test_get_groups_requires_an_exact_unique_match(monkeypatch):
    """A substring match must not resolve someone else's groups."""
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(_users_transport({"results": [{"username": "alexander", "groups_obj": []}]})),
    )
    with pytest.raises(AuthentikError):
        await authentik.get_groups("alex")


async def test_deactivated_user_has_no_groups(monkeypatch):
    monkeypatch.setattr(
        authentik,
        "httpx",
        _Shim(
            _users_transport(
                {"results": [{"username": "alex", "is_active": False, "groups_obj": [{"name": "anki_users"}]}]}
            )
        ),
    )
    assert await authentik.get_groups("alex") == []


async def test_group_gate_caches_within_ttl(monkeypatch):
    calls = []

    async def fake_get_groups(username):
        calls.append(username)
        return ["anki_users"]

    monkeypatch.setattr(authentik, "get_groups", fake_get_groups)
    gate = GroupGate(ttl=100, group="anki_users")

    assert await gate.is_authorized("alex", now=0.0) is True
    assert await gate.is_authorized("alex", now=50.0) is True
    assert calls == ["alex"]

    assert await gate.is_authorized("alex", now=101.0) is True
    assert calls == ["alex", "alex"]


async def test_group_gate_notices_revocation_after_ttl(monkeypatch):
    groups = ["anki_users"]

    async def fake_get_groups(username):  # noqa: ARG001
        return list(groups)

    monkeypatch.setattr(authentik, "get_groups", fake_get_groups)
    gate = GroupGate(ttl=100, group="anki_users")

    assert await gate.is_authorized("alex", now=0.0) is True
    groups.clear()
    assert await gate.is_authorized("alex", now=50.0) is True, "still cached"
    assert await gate.is_authorized("alex", now=101.0) is False


async def test_group_gate_serves_stale_on_outage(monkeypatch):
    """An SSO outage must not cut off users who were authorized a minute ago."""
    fail = False

    async def fake_get_groups(username):  # noqa: ARG001
        if fail:
            raise AuthentikError("down")
        return ["anki_users"]

    monkeypatch.setattr(authentik, "get_groups", fake_get_groups)
    gate = GroupGate(ttl=10, group="anki_users")

    assert await gate.is_authorized("alex", now=0.0) is True
    fail = True
    assert await gate.is_authorized("alex", now=100.0) is True


async def test_group_gate_fails_closed_without_a_previous_answer(monkeypatch):
    async def fake_get_groups(username):  # noqa: ARG001
        raise AuthentikError("down")

    monkeypatch.setattr(authentik, "get_groups", fake_get_groups)
    gate = GroupGate(ttl=10, group="anki_users")

    with pytest.raises(AuthentikError):
        await gate.is_authorized("newcomer", now=0.0)

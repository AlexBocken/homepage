"""Authentik client for the Anki bridge.

Two questions need answering, and Authentik answers them in two different ways:

* *Is this the user's password?* — Authentik has no "check password" endpoint,
  and its OAuth password grant only authenticates service accounts. The only way
  is to drive the authentication flow through the Flow Executor API on a
  throwaway session. This is a direct port of `verifyPassword()` in
  `src/lib/server/authentik.ts`; keep the two in sync.
* *May they use Anki?* — the admin API, with the service-account token.

Consequence worth knowing: failed logins here count toward Authentik's normal
login throttling, and Anki retries on its own. A user who fumbles their password
a few times in Anki may end up throttled at the SSO level.
"""

from __future__ import annotations

import os
import time
from urllib.parse import urlparse

import httpx

ISSUER = os.environ.get("AUTHENTIK_ISSUER", "")
API_TOKEN = os.environ.get("AUTHENTIK_API_TOKEN", "")
# Slug of the flow with an identification + password stage. Same default and
# same override name as the website uses.
AUTH_FLOW_SLUG = os.environ.get("AUTHENTIK_AUTH_FLOW_SLUG", "default-authentication-flow")
# Group a user must be in to sync at all.
ANKI_GROUP = os.environ.get("ANKI_GROUP", "anki_users")
GROUP_CACHE_TTL = int(os.environ.get("GROUP_CACHE_TTL", "3600"))

# The issuer looks like https://sso.example.org/application/o/main/ — the API
# lives at the same origin under /api/v3.
ORIGIN = f"{urlparse(ISSUER).scheme}://{urlparse(ISSUER).netloc}" if ISSUER else ""
API_BASE = f"{ORIGIN}/api/v3"


class AuthentikError(RuntimeError):
    """Authentik was unreachable or answered in a shape we cannot act on."""


class UnsupportedFlowError(AuthentikError):
    """The configured flow can't be driven headlessly (e.g. it has a captcha)."""


async def verify_password(username: str, password: str) -> bool:
    """Check a user's current password by driving the authentication flow.

    A wrong password makes Authentik re-present the credential stage → False.
    Advancing past it (to success, MFA, consent, …) means the password was
    accepted → True.
    """
    if not ORIGIN:
        raise AuthentikError("AUTHENTIK_ISSUER is not configured")

    url = f"{ORIGIN}/api/v3/flows/executor/{AUTH_FLOW_SLUG}/?query="
    # A fresh client per attempt: the executor keeps flow state in a session
    # cookie, and one user's half-finished flow must never leak into another's.
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
        try:
            res = await client.get(url, headers={"Accept": "application/json"})
        except httpx.HTTPError as exc:
            raise AuthentikError(f"could not start Authentik flow: {exc}") from exc
        if res.status_code >= 400:
            raise AuthentikError(f"could not start Authentik flow: HTTP {res.status_code}")
        data = _json_or_empty(res)

        submitted_password = False
        for _ in range(8):
            component = data.get("component")

            if submitted_password:
                # Credential stage shown again = rejected; anything else = accepted.
                return component not in ("ak-stage-password", "ak-stage-identification")

            if component == "ak-stage-identification":
                body: dict[str, str] = {"uid_field": username}
                if data.get("password_fields"):
                    # Combined identification + password stage.
                    body["password"] = password
                    submitted_password = True
            elif component == "ak-stage-password":
                body = {"password": password}
                submitted_password = True
            else:
                # Redirect/success before any password prompt, or a captcha or
                # other stage we cannot drive.
                raise UnsupportedFlowError(f"unsupported Authentik stage: {component!r}")

            try:
                res = await client.post(url, json=body, headers={"Accept": "application/json"})
            except httpx.HTTPError as exc:
                raise AuthentikError(f"Authentik flow error: {exc}") from exc
            if res.status_code >= 500:
                raise AuthentikError(f"Authentik flow error: HTTP {res.status_code}")
            data = _json_or_empty(res)

    return False


async def _list_users(params: dict[str, str]) -> list[dict]:
    if not ORIGIN:
        raise AuthentikError("AUTHENTIK_ISSUER is not configured")
    if not API_TOKEN:
        raise AuthentikError("AUTHENTIK_API_TOKEN is not configured")

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(
                f"{API_BASE}/core/users/",
                params=params,
                headers={"Authorization": f"Bearer {API_TOKEN}", "Accept": "application/json"},
            )
        except httpx.HTTPError as exc:
            raise AuthentikError(f"user lookup failed: {exc}") from exc
    if res.status_code >= 400:
        raise AuthentikError(f"user lookup failed: HTTP {res.status_code}")
    return _json_or_empty(res).get("results") or []


async def resolve_user(identifier: str) -> dict | None:
    """Find the Authentik user behind a username *or* an email address.

    People type either into Anki, and the sync account has to key off one of
    them or the same person ends up with two collections. The username is the
    canonical form — it is what Authentik's OIDC `nickname` claim carries, so it
    is also what the website's settings card shows.

    Returns the full user record (so the caller gets groups and `is_active`
    without a second round trip), or None if nothing matches. Ambiguity is an
    error, never a guess: Authentik does not enforce unique emails, and picking
    one of two candidates would hand somebody else's collection over.
    """
    # Exact username first. The API filter is exact, but we re-check locally
    # rather than trust its semantics — same guard as `resolvePkByUsername`.
    matches = [u for u in await _list_users({"username": identifier}) if u.get("username") == identifier]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        raise AuthentikError(f"{len(matches)} users share the username {identifier!r}")

    if "@" not in identifier:
        return None

    # Email, matched case-insensitively — people capitalise inconsistently and
    # nobody expects Anki to care. `search` is a case-insensitive contains over
    # username/name/email, so the exact comparison happens here.
    candidates = [
        u
        for u in await _list_users({"search": identifier})
        if (u.get("email") or "").casefold() == identifier.casefold()
    ]
    if len(candidates) == 1:
        return candidates[0]
    if len(candidates) > 1:
        raise AuthentikError(f"{len(candidates)} users share the email {identifier!r}")
    return None


def groups_of(user: dict) -> list[str]:
    """Group names on a user record. A deactivated account has none."""
    if not user.get("is_active", True):
        return []
    return [g.get("name", "") for g in user.get("groups_obj") or []]


async def get_groups(username: str) -> list[str]:
    """Group names for a canonical username."""
    user = await resolve_user(username)
    if user is None:
        raise AuthentikError(f"no such user: {username!r}")
    return groups_of(user)


class GroupGate:
    """Caches `ANKI_GROUP` membership so it can be re-checked cheaply.

    hkeys are permanent by construction, so without a periodic re-check a user
    removed from the group would keep syncing forever. Checking on every request
    would put Authentik in the hot path of every sync round trip, hence the TTL.

    On a lookup failure a *stale* answer is reused if we have one: an Authentik
    outage should not cut off users who were authorized a minute ago. With no
    previous answer at all, the error propagates and the caller denies.
    """

    def __init__(self, ttl: int = GROUP_CACHE_TTL, group: str = ANKI_GROUP) -> None:
        self.ttl = ttl
        self.group = group
        self._cache: dict[str, tuple[bool, float]] = {}

    async def is_authorized(self, username: str, *, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        cached = self._cache.get(username)
        if cached is not None and now < cached[1]:
            return cached[0]

        try:
            allowed = self.group in await get_groups(username)
        except AuthentikError:
            if cached is not None:
                return cached[0]
            raise

        self._cache[username] = (allowed, now + self.ttl)
        return allowed

    def invalidate(self, username: str) -> None:
        self._cache.pop(username, None)


def _json_or_empty(res: httpx.Response) -> dict:
    try:
        data = res.json()
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}

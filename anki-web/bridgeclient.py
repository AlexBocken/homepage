"""Fetching a user's sync credentials from anki-bridge.

The bridge owns `accounts.db` and is the only thing that talks to Authentik about
sync accounts, so it is also the only thing that can say what credential a given
user's collection answers to. This asks it, and hands the answer to the instance
that will do the syncing.

What comes back is a session key with full read/write on that user's collection.
It lives in the child's environment and nowhere else — not on disk here, not in a
log line, not in an error returned to a browser.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import httpx

log = logging.getLogger("anki-web.bridge")

BRIDGE_URL = os.environ.get("ANKI_BRIDGE_URL", "http://127.0.0.1:8092").rstrip("/")
BRIDGE_TOKEN = os.environ.get("ANKI_BRIDGE_TOKEN", "")

#: Provisioning a first-time user restarts the sync server, which drains
#: in-flight syncs first. That is slow by design, so allow for it.
TIMEOUT = httpx.Timeout(connect=5.0, read=90.0, write=10.0, pool=5.0)


class BridgeError(Exception):
    """The bridge could not be asked, or would not answer."""


@dataclass(frozen=True)
class SyncCredentials:
    username: str
    hkey: str
    endpoint: str

    def __repr__(self) -> str:  # pragma: no cover - defensive
        # The hkey is a bearer credential; a stray repr in a traceback or a log
        # line is exactly how those leak.
        return f"SyncCredentials(username={self.username!r}, hkey=<redacted>, endpoint={self.endpoint!r})"


async def fetch_credentials(
    username: str,
    *,
    base_url: str | None = None,
    token: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> SyncCredentials:
    """Ask the bridge for `username`'s sync credentials, provisioning if needed."""
    base = (base_url or BRIDGE_URL).rstrip("/")
    bridge_token = token if token is not None else BRIDGE_TOKEN
    if not bridge_token:
        # Failing closed: without the token the bridge answers 403 anyway, and a
        # clear message here beats debugging a 403 from two services away.
        raise BridgeError("no bridge token configured")

    owned = client is None
    http = client or httpx.AsyncClient(timeout=TIMEOUT)
    try:
        res = await http.post(
            f"{base}/internal/sync-credentials",
            params={"username": username},
            headers={"x-bridge-token": bridge_token},
        )
    except httpx.HTTPError as exc:
        raise BridgeError(f"bridge unreachable: {exc}") from exc
    finally:
        if owned:
            await http.aclose()

    if res.status_code != 200:
        # Deliberately not echoing the body: it is the bridge's, and on a 403 it
        # tells an attacker their token guess was wrong in a distinguishable way.
        raise BridgeError(f"bridge refused ({res.status_code})")

    try:
        body = res.json()
        return SyncCredentials(
            username=body["username"], hkey=body["hkey"], endpoint=body["endpoint"]
        )
    except (ValueError, KeyError) as exc:
        raise BridgeError("bridge returned an unreadable answer") from exc

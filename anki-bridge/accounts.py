"""Per-user sync accounts for the Anki bridge.

Anki's built-in sync server has no user API: accounts are `SYNC_USER1..N`
environment variables (`username:password`), parsed once at startup in
`SimpleServerInner::new_from_env`. This module owns that account list — one row
per Authentik user, rendered back out as the env map the child process is
spawned with.

Two protocol details from `rslib/src/sync/http_server/mod.rs` shape everything
here:

* The loop reading `SYNC_USER{idx}` **breaks at the first missing index**, so
  the slots must stay contiguous from 1. A gap silently truncates the user list
  and everyone past it stops being able to log in.
* `hkey = hex(sha1("username:password"))` — the session key Anki clients hold is
  derived from the env string alone. That makes it stable across restarts (so
  adding a user does not log anyone out), and it makes this database secret
  material: see the note on `sync_secret` below.
"""

from __future__ import annotations

import hashlib
import secrets
import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime, timezone

# Writing `last_seen` on every proxied request would mean a database write per
# HTTP round trip, and a sync is many round trips. Coalesce to at most one write
# per user per this many seconds — the field is for the settings page, not
# accounting.
LAST_SEEN_RESOLUTION_SECS = 60


def hkey_for(username: str, sync_secret: str) -> str:
    """Mirror of Anki's `derive_hkey`: sha1 over the raw `user:pass` env string.

    Deliberately sha1 and deliberately unsalted — this is not a password hash,
    it reproduces a value the sync server computes the same way. Changing it
    would simply stop matching the server.
    """
    return hashlib.sha1(f"{username}:{sync_secret}".encode()).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass(frozen=True)
class Account:
    """One Authentik user's sync account.

    `sync_secret` is **not** the user's password. The user's real Authentik
    password is relayed to the flow executor and dropped; it is never stored.
    This is a random string the bridge invented so the sync server has some
    credential for the account, and no human ever sees or types it.

    It is nonetheless a bearer credential: anyone holding it can compute
    `hkey_for(...)` and use it against the public endpoint directly. Hashing the
    column would not help — `derive_hkey` hashes whatever string ends up in the
    env, so a stored PBKDF2 hash yields an equally usable hkey. The database
    file is the security boundary; keep it 0600 in the unit's StateDirectory and
    treat backups of it as secrets.
    """

    username: str
    sync_secret: str
    hkey: str
    slot: int
    created_at: str
    last_seen: str | None

    @property
    def env_value(self) -> str:
        """The `SYNC_USER<slot>` value this account renders to."""
        return f"{self.username}:{self.sync_secret}"


class AccountStore:
    """SQLite-backed account list.

    Writes are rare (one per new user) and reads are small, so a single
    connection behind a lock is plenty; there is no need for an async driver.
    """

    def __init__(self, path: str) -> None:
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        # Remembered per username so the coalesced `last_seen` write does not
        # need a read first.
        self._last_seen_written: dict[str, float] = {}
        self._migrate()

    def _migrate(self) -> None:
        with self._lock:
            self._db.executescript(
                """
                CREATE TABLE IF NOT EXISTS accounts (
                    username    TEXT PRIMARY KEY,
                    sync_secret TEXT NOT NULL,
                    hkey        TEXT NOT NULL,
                    slot        INTEGER NOT NULL UNIQUE,
                    created_at  TEXT NOT NULL,
                    last_seen   TEXT
                );
                CREATE INDEX IF NOT EXISTS accounts_hkey ON accounts (hkey);
                """
            )
            self._db.commit()

    # ------------------------------------------------------------------ reads

    def get(self, username: str) -> Account | None:
        with self._lock:
            row = self._db.execute(
                "SELECT * FROM accounts WHERE username = ?", (username,)
            ).fetchone()
        return _row_to_account(row)

    def by_hkey(self, hkey: str) -> Account | None:
        """Reverse lookup for per-request re-authorization.

        Every proxied request past the login carries only an hkey, so this is
        how the bridge recovers which Authentik user is behind it and re-checks
        their group membership.
        """
        with self._lock:
            row = self._db.execute(
                "SELECT * FROM accounts WHERE hkey = ?", (hkey,)
            ).fetchone()
        return _row_to_account(row)

    def all(self) -> list[Account]:
        with self._lock:
            rows = self._db.execute("SELECT * FROM accounts ORDER BY slot").fetchall()
        return [_row_to_account(r) for r in rows]  # type: ignore[misc]

    def render_env(self) -> dict[str, str]:
        """The `SYNC_USER*` map to spawn the sync server with.

        Raises if the slots are not contiguous from 1 — the server would stop
        reading at the gap and silently drop every account past it, which looks
        to those users like their password stopped working.
        """
        accounts = self.all()
        for expected, account in enumerate(accounts, start=1):
            if account.slot != expected:
                raise RuntimeError(
                    f"non-contiguous sync slots: expected {expected}, "
                    f"got {account.slot} for {account.username!r}"
                )
        return {f"SYNC_USER{a.slot}": a.env_value for a in accounts}

    # ----------------------------------------------------------------- writes

    def ensure(self, username: str) -> tuple[Account, bool]:
        """Return this user's account, creating it if they have never synced.

        Returns `(account, created)`. A `created` of True means the sync server
        does not know about this account yet and must be respawned before the
        credentials will work.
        """
        existing = self.get(username)
        if existing is not None:
            return existing, False

        sync_secret = secrets.token_urlsafe(32)
        with self._lock:
            slot = self._next_slot_locked()
            created_at = _now()
            self._db.execute(
                "INSERT INTO accounts (username, sync_secret, hkey, slot, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (username, sync_secret, hkey_for(username, sync_secret), slot, created_at),
            )
            self._db.commit()

        account = self.get(username)
        assert account is not None
        return account, True

    def rotate(self, username: str) -> Account:
        """Issue a new secret, invalidating every client logged in as this user.

        The only revocation primitive available: hkeys never expire on their
        own, so cutting someone off means changing the string they were derived
        from.
        """
        sync_secret = secrets.token_urlsafe(32)
        with self._lock:
            cur = self._db.execute(
                "UPDATE accounts SET sync_secret = ?, hkey = ? WHERE username = ?",
                (sync_secret, hkey_for(username, sync_secret), username),
            )
            self._db.commit()
            if cur.rowcount == 0:
                raise KeyError(username)
        account = self.get(username)
        assert account is not None
        return account

    def delete(self, username: str) -> None:
        """Remove an account and close the slot gap it leaves behind.

        Renumbering changes no `username:secret` string, so it does not change
        anyone's hkey — the remaining users stay logged in.
        """
        with self._lock:
            self._db.execute("DELETE FROM accounts WHERE username = ?", (username,))
            rows = self._db.execute(
                "SELECT username FROM accounts ORDER BY slot"
            ).fetchall()
            # Two passes through a scratch range: `slot` is UNIQUE, so assigning
            # final numbers directly can collide with a row not yet moved.
            for offset, row in enumerate(rows, start=1):
                self._db.execute(
                    "UPDATE accounts SET slot = ? WHERE username = ?",
                    (-offset, row["username"]),
                )
            self._db.execute("UPDATE accounts SET slot = -slot WHERE slot < 0")
            self._db.commit()
            self._last_seen_written.pop(username, None)

    def touch(self, username: str, *, monotonic: float) -> None:
        """Record activity, at most once per `LAST_SEEN_RESOLUTION_SECS`."""
        previous = self._last_seen_written.get(username)
        if previous is not None and monotonic - previous < LAST_SEEN_RESOLUTION_SECS:
            return
        self._last_seen_written[username] = monotonic
        with self._lock:
            self._db.execute(
                "UPDATE accounts SET last_seen = ? WHERE username = ?",
                (_now(), username),
            )
            self._db.commit()

    def close(self) -> None:
        with self._lock:
            self._db.close()

    # ---------------------------------------------------------------- helpers

    def _next_slot_locked(self) -> int:
        """Smallest unused slot, so deletes leave no gap for the next user."""
        used = {
            r["slot"] for r in self._db.execute("SELECT slot FROM accounts").fetchall()
        }
        slot = 1
        while slot in used:
            slot += 1
        return slot


def _row_to_account(row: sqlite3.Row | None) -> Account | None:
    if row is None:
        return None
    return Account(
        username=row["username"],
        sync_secret=row["sync_secret"],
        hkey=row["hkey"],
        slot=row["slot"],
        created_at=row["created_at"],
        last_seen=row["last_seen"],
    )

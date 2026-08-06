"""Shared fixtures.

The service reads its configuration into module-level constants at import time,
so the environment has to be set up *before* `app` is imported — hence the env
poking at the top of this file rather than in a fixture.
"""

from __future__ import annotations

import os
import shutil
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_STATE = tempfile.mkdtemp(prefix="anki-bridge-tests-")
os.environ["STATE_DIR"] = _STATE
os.environ["SYNC_BASE"] = os.path.join(_STATE, "sync")
os.environ["ACCOUNTS_DB"] = os.path.join(_STATE, "accounts.db")
os.environ["BRIDGE_TOKEN"] = "test-bridge-token"
os.environ["ANKI_SYNC_PUBLIC_URL"] = "https://anki.example.org/"
os.environ["AUTHENTIK_ISSUER"] = "https://sso.example.org/application/o/main/"
os.environ["AUTHENTIK_API_TOKEN"] = "test-api-token"


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    shutil.rmtree(_STATE, ignore_errors=True)


@pytest.fixture
def store(tmp_path):
    from accounts import AccountStore

    s = AccountStore(str(tmp_path / "accounts.db"))
    yield s
    s.close()

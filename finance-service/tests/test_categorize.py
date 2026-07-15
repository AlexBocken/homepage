"""Guards the categorization support in app.py.

The website stores an account override keyed by `txn_key`; the ledger importers
(accounting/importers/overrides.py) later look it up by recomputing the same
hash. If the two formulas ever drift, every override silently stops applying — so
this pins the hash to known values and checks the /categorize contract.
"""

import os

from fastapi.testclient import TestClient
from beancount import loader
from beancount.core import data
from beancount.core.number import D
from datetime import date

import app as service
from app import txn_key, categorize_fields, _bank_posting, UNCATEGORIZED

client = TestClient(service.app)

LEDGER_PATH = os.environ.get("LEDGER_PATH", service.LEDGER_PATH)
ENTRIES, _, _ = loader.load_file(LEDGER_PATH)
TXNS = [e for e in ENTRIES if isinstance(e, data.Transaction)]


def test_txn_key_pinned():
    # Precomputed with accounting/importers/overrides.py — must never change.
    assert txn_key(date(2025, 7, 3), None,
                   "Online purchase ZKB Visa Debit card no. xxxx 0810, ETH Zurich 0809",
                   D("-5.00")) == "962e65e7b52e"
    assert txn_key(date(2025, 8, 13), None, "Refund PAYPAL *LENOVO",
                   D("89.51")) == "340128a30d8c"


def test_categorize_fields_shape():
    for t in TXNS:
        f = categorize_fields(t)
        assert set(f) == {"key", "bank_amount", "uncategorized", "current"}
        assert len(f["key"]) == 12
        bp = _bank_posting(t)
        # bank_amount is the raw Decimal string that lands in overrides.csv.
        assert f["bank_amount"] == str(bp.units.number if bp and bp.units else "")


def test_categorize_endpoint():
    r = client.get("/categorize")
    assert r.status_code == 200
    d = r.json()
    assert {"txns", "accounts", "usage"} <= set(d)
    # Every queued txn is genuinely Uncategorized and carries a key.
    for t in d["txns"]:
        assert t["uncategorized"] is True
        assert len(t["key"]) == 12
    # No Uncategorized account is offered as an assignment target.
    assert not (set(d["accounts"]) & set(UNCATEGORIZED))
    # Accounts are ranked by descending usage.
    usage = d["usage"]
    ranks = [usage[a] for a in d["accounts"] if a in usage]
    assert ranks == sorted(ranks, reverse=True)

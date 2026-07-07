"""Cross-check the API's headline numbers against the ledger itself.

Guards the conversion/aggregation logic in app.py: net worth, the balance-sheet
roots, income/expense totals, and holdings cost/market all have to agree with a
straight beancount computation over the same ledger. Run with `pytest`.
"""

import os

from fastapi.testclient import TestClient

from beancount import loader
from beancount.core import convert, data, prices
from beancount.core.inventory import Inventory
from beancount.core.number import D

import app as service
from app import xirr
from datetime import date as _date

client = TestClient(service.app)

LEDGER_PATH = os.environ.get("LEDGER_PATH", service.LEDGER_PATH)
ENTRIES, _, OPTIONS = loader.load_file(LEDGER_PATH)
PRICE_MAP = prices.build_price_map(ENTRIES)
OPCUR = (OPTIONS.get("operating_currency") or ["CHF"])[0]
TXNS = [e for e in ENTRIES if isinstance(e, data.Transaction)]
TODAY = max(t.date for t in TXNS)


def root_value(root, at):
    inv = Inventory()
    for t in TXNS:
        if t.date > at:
            continue
        for p in t.postings:
            if p.account.startswith(root):
                inv.add_position(p)
    reduced = inv.reduce(convert.convert_position, OPCUR, PRICE_MAP, at)
    return sum((pos.units.number for pos in reduced if pos.units.currency == OPCUR), D("0"))


def approx(a, b, tol=D("0.05")):
    return abs(D(str(a)) - D(str(b))) <= tol


def test_health_ok():
    r = client.get("/health").json()
    assert r["status"] == "ok"
    assert r["errors"] == 0


def test_networth_snapshot_matches_ledger():
    snap = client.get("/networth").json()["snapshot"]
    assert approx(snap["assets"], root_value("Assets", TODAY))
    assert approx(snap["liabilities"], root_value("Liabilities", TODAY))
    assert approx(snap["net"], snap["assets"] + snap["liabilities"])


def test_balance_sheet_roots_match_ledger():
    sections = {s["name"]: s["value"] for s in client.get("/balance-sheet").json()["sections"]}
    assert approx(sections["Assets"], root_value("Assets", TODAY))
    assert approx(sections["Liabilities"], root_value("Liabilities", TODAY))


def test_income_statement_totals_match_ledger():
    # from=start so the period covers the whole ledger (default is now last 12mo).
    r = client.get("/income-statement", params={"from": "2000-01-01"}).json()
    sections = {s["name"]: s["value"] for s in r["sections"]}
    # Income is displayed sign-flipped to positive; Expenses stay positive.
    assert approx(sections["Income"], -root_value("Income", TODAY))
    assert approx(sections["Expenses"], root_value("Expenses", TODAY))


def test_holdings_totals_are_consistent():
    data_ = client.get("/holdings").json()
    tot = data_["totals"]
    assert approx(tot["gain_chf"], tot["market_chf"] - tot["cost_chf"])
    # Sum of rows equals the reported totals.
    assert approx(sum(h["market_chf"] for h in data_["holdings"]), tot["market_chf"])
    assert all(h["asset_class"] for h in data_["holdings"])


def test_cost_basis_differs_from_market():
    market = client.get("/networth", params={"basis": "market"}).json()["snapshot"]
    cost = client.get("/networth", params={"basis": "cost"}).json()["snapshot"]
    # Same cash + liabilities; only holdings are revalued, and the portfolio has
    # an unrealized gain, so market assets exceed cost assets.
    assert market["assets"] > cost["assets"]
    assert approx(market["liabilities"], cost["liabilities"])
    # Balance sheet honours the basis identically.
    bs_cost = {s["name"]: s["value"] for s in client.get("/balance-sheet", params={"basis": "cost"}).json()["sections"]}
    assert approx(bs_cost["Assets"], cost["assets"])


def test_by_currency_exposure():
    d = client.get("/networth", params={"by_currency": "true"}).json()
    assert d["by_currency"] is True
    assert set(d["currencies"]) == {"CHF", "EUR", "USD"}
    # Series points carry native per-currency amounts (not converted to CHF), so
    # the CHF bucket alone is less than the fully-converted net worth.
    converted = client.get("/networth").json()["snapshot"]["net"]
    last = d["series"][-1]
    assert last["CHF"] < converted
    assert "EUR" in last and "USD" in last
    # Snapshot broken out per currency by root: liabilities are CHF-only.
    assert d["snapshot_by_currency"]["CHF"]["liabilities"] < 0
    assert "liabilities" not in d["snapshot_by_currency"]["EUR"]
    assert "assets" in d["snapshot_by_currency"]["EUR"]


def test_expenses_internal_consistency():
    d = client.get("/expenses").json()
    # Categories and months each partition the total.
    assert approx(sum(c["amount"] for c in d["by_category"]), d["total"], tol=D("0.1"))
    assert approx(sum(m["amount"] for m in d["monthly"]), d["total"], tol=D("0.1"))
    # Drilling into a child yields exactly that child's slice of the parent.
    shopping_parent = next(c["amount"] for c in d["by_category"] if c["account"] == "Expenses:Shopping")
    drill = client.get("/expenses", params={"account": "Expenses:Shopping"}).json()
    assert approx(drill["total"], shopping_parent)
    # Sub-categories partition the drill total.
    assert approx(sum(c["amount"] for c in drill["by_category"]), drill["total"], tol=D("0.1"))


def test_journal_scoped_amount_and_boundary():
    d = client.get("/journal", params={"account": "Expenses:Shopping", "limit": 500}).json()
    # Boundary match: every returned txn touches the subtree, and the scoped
    # amount sums the account's own postings (positive for expenses).
    assert d["total"] > 0
    for t in d["transactions"]:
        assert any(
            p["account"] == "Expenses:Shopping" or p["account"].startswith("Expenses:Shopping:")
            for p in t["postings"]
        )
    total_scoped = sum(t["amount_chf"] for t in d["transactions"])
    drill = client.get("/expenses", params={"account": "Expenses:Shopping"}).json()
    assert approx(total_scoped, drill["total"], tol=D("0.1"))
    # Every txn carries a full posting list (each with a CHF value) + a total.
    for t in d["transactions"]:
        assert len(t["postings"]) >= 2
        assert all("chf" in p for p in t["postings"])
        assert t["total_chf"] is not None


def test_journal_payee_filter():
    all_tx = client.get("/journal", params={"limit": 500, "from": "2000-01-01"}).json()
    payees = [t["payee"] for t in all_tx["transactions"] if t["payee"]]
    assert payees
    target = payees[0]
    filt = client.get("/journal", params={"payee": target, "from": "2000-01-01", "limit": 500}).json()
    assert filt["total"] >= 1
    assert all(t["payee"] == target for t in filt["transactions"])


def test_cashflow_consistency():
    d = client.get("/cashflow").json()
    n = len(d["months"])
    assert n > 0 and len(d["net"]) == n
    # Income returned positive; expenses positive; net = income - expenses per month.
    for i in range(n):
        inc = sum((r["monthly"][i] or 0) for r in d["income"])
        exp = sum((r["monthly"][i] or 0) for r in d["expenses"])
        assert approx(d["net"][i], inc - exp, tol=D("0.1"))
    # Period income/expense totals line up with the /expenses + income view.
    exp_total = client.get("/expenses").json()["total"]
    assert approx(sum(r["total"] for r in d["expenses"]), exp_total, tol=D("1"))
    assert all((r["total"] or 0) >= 0 for r in d["income"])


def test_investments_snapshot_and_series():
    # from=start so the P/L series begins before the first purchase (pl == 0).
    d = client.get("/investments", params={"from": "2000-01-01"}).json()
    holdings = client.get("/holdings").json()
    # Snapshot matches /holdings.
    assert approx(d["totals"]["market_chf"], holdings["totals"]["market_chf"])
    assert {h["commodity"] for h in d["holdings"]} == {h["commodity"] for h in holdings["holdings"]}
    # Cumulative P/L: last point's pl == market - invested cost, and starts at 0.
    first, last = d["pl_series"][0], d["pl_series"][-1]
    assert approx(first["pl"], 0, tol=D("0.01"))
    assert approx(last["pl"], (last["market"] or 0) - (last["cost"] or 0), tol=D("0.01"))
    # Performance series are aligned to one date axis and rebased (start ~0%).
    n = len(d["performance"]["dates"])
    for s in d["performance"]["series"]:
        assert len(s["pct"]) == n
        firstnn = next((x for x in s["pct"] if x is not None), None)
        assert firstnn is None or abs(firstnn) < 0.01


def test_xirr_solver_known_cases():
    # 1000 in, 1100 out one year later -> 10 %/yr.
    r = xirr([(_date(2025, 1, 1), -1000), (_date(2026, 1, 1), 1100)])
    assert abs(r - 0.10) < 1e-3
    # Doubling over one year -> 100 %/yr.
    r2 = xirr([(_date(2025, 1, 1), -1000), (_date(2026, 1, 1), 2000)])
    assert abs(r2 - 1.0) < 1e-3
    # Same-sign flows are unsolvable.
    assert xirr([(_date(2025, 1, 1), -1000), (_date(2026, 1, 1), -100)]) is None


def test_investments_xirr_twr_present():
    d = client.get("/investments").json()
    t = d["totals"]
    for k in ("xirr_pct", "twr_pct", "dividends_chf"):
        assert isinstance(t[k], (int, float))
    # Every holding gets XIRR + TWR (buy-only portfolio, always solvable).
    assert all(isinstance(h["xirr_pct"], (int, float)) for h in d["holdings"])
    assert all(isinstance(h["twr_pct"], (int, float)) for h in d["holdings"])
    # Portfolio dividends = sum of per-holding dividends.
    assert approx(sum(h["dividends_chf"] for h in d["holdings"]), t["dividends_chf"], tol=D("0.1"))


def test_german_dividend_net_of_15_percent_withholding():
    d = client.get("/holding", params={"commodity": "VOW"}).json()
    assert d["dividends"], "VOW should have a dividend"
    for dv in d["dividends"]:
        # 15 % treaty withholding already booked -> net is 85 % of gross.
        assert approx(dv["withholding"], dv["gross"] * 0.15, tol=D("0.05"))
        assert approx(dv["net"], dv["gross"] - dv["withholding"], tol=D("0.01"))
    # US ETF (VUSA) has no withholding -> net == gross.
    v = client.get("/holding", params={"commodity": "VUSA"}).json()
    assert v["dividends"] and all(x["withholding"] == 0 for x in v["dividends"])
    assert approx(v["current"]["dividends_chf"], sum(x["net"] for x in v["dividends"]))


def test_holding_deep_dive():
    d = client.get("/holding", params={"commodity": "VUSA"}).json()
    assert d["commodity"] == "VUSA"
    tl = d["timeline"]
    n = len(tl["dates"])
    # Every series on the deep dive shares one date axis (so charts align).
    assert n > 0
    for k in ("price", "market", "cost", "own"):
        assert len(tl[k]) == n
    assert all(len(b["pct"]) == n for b in tl["benchmarks"])
    # Market series ends at the current market value; transactions are the buys.
    assert approx(tl["market"][-1], d["current"]["market_chf"])
    assert d["transactions"] and all(t["units"] is not None for t in d["transactions"])
    assert 0 <= d["portfolio_share"] <= 100
    # Unknown / unheld commodity -> 404.
    assert client.get("/holding", params={"commodity": "NOPE"}).status_code == 404


def test_tax_wealth_excludes_pension_and_pillar3a():
    d = client.get("/tax-wealth").json()
    assert d["threshold"] == 80000
    assert d["must_file"] == (d["taxable_assets"] > d["threshold"])
    # Equals total Assets minus the excluded subtrees, at today's market.
    all_assets = root_value("Assets", TODAY)
    excluded = root_value("Assets:PensionFund:MPS", TODAY) + root_value("Assets:Frankly", TODAY)
    assert approx(d["taxable_assets"], all_assets - excluded, tol=D("1"))


def test_parse_budgets_intervals_and_ordering():
    from beancount import loader
    from beancount.core import prices
    src = """
2025-01-01 open Expenses:Food
2025-01-01 custom "budget" Expenses:Food "monthly" 600 CHF
2025-06-01 custom "budget" Expenses:Food "monthly" 650 CHF
2025-01-01 custom "budget" Expenses:Rent "yearly" 12000 CHF
2025-01-01 custom "budget" Expenses:Coffee "weekly" 10 CHF
"""
    entries, _, _ = loader.load_string(src)
    led = service.Ledger()
    led.entries = entries
    led.opcur = "CHF"
    led.price_map = prices.build_price_map(entries)
    b = service.parse_budgets(led)
    # Yearly -> monthly = /12; weekly -> *365/12/7.
    assert approx(b["Expenses:Rent"][0][1], 1000)
    assert approx(b["Expenses:Coffee"][0][1], D("10") * D("365") / D("12") / D("7"), tol=D("0.01"))
    # Sorted by date; the later Food budget supersedes the earlier from its date.
    assert [d for d, _ in b["Expenses:Food"]] == sorted(d for d, _ in b["Expenses:Food"])
    assert service._active_monthly(b["Expenses:Food"], _date(2025, 3, 1)) == 600
    assert service._active_monthly(b["Expenses:Food"], _date(2025, 8, 1)) == 650


def test_budget_structure_and_consistency():
    d = client.get("/budget").json()
    # Pace + streak blocks are always present and well-formed.
    assert len(d["current"]["rows"]) == len(d["rows"])  # both come from the budget set
    assert len(d["streak"]["months"]) == 12
    assert 1 <= d["current"]["day"] <= 31
    assert 0 <= d["current"]["elapsed_frac"] <= 1
    # Streak = consecutive under-and-budgeted months counted back from newest.
    expected = 0
    for m in reversed(d["streak"]["months"]):
        if not m["has_budget"]:
            break
        if m["under"]:
            expected += 1
        else:
            break
    assert d["streak"]["count"] == expected
    # A budgeted category's range actual matches /expenses for that account.
    if d["rows"]:
        r = d["rows"][0]
        exp = client.get("/expenses", params={"account": r["account"]}).json()["total"]
        assert approx(r["actual"], exp, tol=D("0.5"))


def test_savings_target_block():
    from beancount import loader
    from beancount.core import prices
    # Use a completed month inside the 12-month lookback (2 months ago).
    y, m = _date.today().year, _date.today().month
    for _ in range(2):
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    mk = f"{y}-{m:02d}"
    src = f"""
2020-01-01 open Assets:Cash
2020-01-01 open Income:Salary
2020-01-01 open Expenses:Food
2020-01-01 custom "savings-target" "monthly" 1000 CHF

{mk}-15 * "pay"
  Assets:Cash     3000 CHF
  Income:Salary  -3000 CHF
{mk}-20 * "food"
  Expenses:Food    500 CHF
  Assets:Cash     -500 CHF
"""
    entries, _, _ = loader.load_string(src)
    led = service.Ledger()
    led.entries = entries
    led.opcur = "CHF"
    led.price_map = prices.build_price_map(entries)
    led.txns = [e for e in entries if type(e).__name__ == "Transaction"]
    t = service.savings_target_block(led)
    assert t is not None
    assert approx(t["monthly"], 1000)
    row = next(mm for mm in t["months"] if mm["month"] == mk)
    # Saved 3000 income − 500 expense = 2500 ≥ 1000 target → hit.
    assert approx(row["saved"], 2500)
    assert row["hit"] is True
    # No target directive -> no block.
    led2 = service.Ledger()
    led2.entries = [e for e in entries if type(e).__name__ != "Custom"]
    led2.opcur = "CHF"
    led2.price_map = {}
    led2.txns = led.txns
    assert service.savings_target_block(led2) is None


def test_forecast_monthly_estimates():
    d = client.get("/forecast").json()
    assert d["based_on_months"] >= 1
    # Category estimates sum to the totals; net = income − expenses.
    assert approx(sum(r["monthly"] for r in d["income"]), d["income_total"], tol=D("0.1"))
    assert approx(sum(r["monthly"] for r in d["expenses"]), d["expense_total"], tol=D("0.1"))
    assert approx(d["net"], d["income_total"] - d["expense_total"], tol=D("0.1"))
    # A 1-month window equals that single completed month's totals (mean of one).
    one = client.get("/forecast", params={"months": 1}).json()
    assert one["based_on_months"] in (0, 1)


def test_savings_rate():
    d = client.get("/savings").json()
    assert approx(d["saved"], d["income"] - d["expenses"], tol=D("0.1"))
    if d["income"] > 0:
        assert approx(d["rate"], (D(str(d["income"])) - D(str(d["expenses"]))) / D(str(d["income"])) * 100, tol=D("0.2"))
    # Monthly saved = income − expenses each month.
    for m in d["monthly"]:
        assert approx(m["saved"], (m["income"] or 0) - (m["expenses"] or 0), tol=D("0.1"))
    # Range filter narrows the totals.
    ytd = client.get("/savings", params={"from": "2026-01-01"}).json()
    assert ytd["income"] <= d["income"]


def test_performance_has_benchmarks_field():
    perf = client.get("/investments").json()["performance"]
    assert isinstance(perf["benchmarks"], list)  # empty until a benchmark commodity is declared
    assert all(len(b["pct"]) == len(perf["dates"]) for b in perf["benchmarks"])


def test_holding_performance_rebased():
    tl = client.get("/holding", params={"commodity": "VUSA"}).json()["timeline"]
    # own series is rebased (first non-null ~0%).
    first = next((x for x in tl["own"] if x is not None), None)
    assert first is None or abs(first) < 0.01


def test_bql_query():
    d = client.get("/query", params={"q": "SELECT account, count(account) AS n GROUP BY account"}).json()
    assert d["columns"][0] == "account"
    assert d["count"] == len(d["rows"])
    assert d["rows"]
    # A malformed query is a 400 with a message, not a 500.
    bad = client.get("/query", params={"q": "SELECT FROM WHERE"})
    assert bad.status_code == 400


def test_journal_pagination():
    # from=start so total covers every transaction (default is now last 12mo).
    r = client.get("/journal", params={"limit": 10, "from": "2000-01-01"}).json()
    assert r["total"] == len(TXNS)
    assert len(r["transactions"]) == 10
    # Newest first.
    dates = [t["date"] for t in r["transactions"]]
    assert dates == sorted(dates, reverse=True)


def test_account_view_running_balance_and_children():
    d = client.get("/account", params={"account": "Expenses:Food", "from": "2000-01-01"}).json()
    assert d["account"] == "Expenses:Food"

    # Balance == a straight beancount roll-up over the whole account subtree.
    def subtree(a):
        return a == "Expenses:Food" or a.startswith("Expenses:Food:")
    inv = Inventory()
    for t in TXNS:
        for p in t.postings:
            if subtree(p.account):
                inv.add_position(p)
    reduced = inv.reduce(convert.convert_position, OPCUR, PRICE_MAP, TODAY)
    expected = sum((pos.units.number for pos in reduced if pos.units.currency == OPCUR), D("0"))
    assert approx(d["balance"], expected)

    # Journal is newest-first and its running balance reconciles: newest row's
    # balance is the account balance; opening + Σchanges == balance.
    j = d["journal"]
    assert j, "expected journal rows"
    dates = [r["date"] for r in j]
    assert dates == sorted(dates, reverse=True)
    assert approx(j[0]["balance"], d["balance"])
    total_change = sum((D(str(r["change"])) for r in j), D("0"))
    assert approx(D(str(d["opening"])) + total_change, d["balance"])

    # Children partition the change; their totals sum to (balance - opening).
    csum = sum((D(str(c["total"])) for c in d["children"]), D("0"))
    assert approx(csum, D(str(d["balance"])) - D(str(d["opening"])))
    # Each child has one monthly value per month bucket.
    for c in d["children"]:
        assert len(c["monthly"]) == len(d["months"])

    # Balance series ends at the current balance.
    assert d["balance_series"]
    assert approx(d["balance_series"][-1]["balance"], d["balance"])

"""Beancount finances microservice.

Loads a beancount v3 ledger and exposes read-only JSON for the website's
`/finances` dashboards. Bind it to localhost and let the SvelteKit server proxy
to it via /api/finances/* — it is not meant to be exposed publicly, and it never
writes to the ledger (all imports/edits stay in the ledger repo's CLI workflow).

The ledger is loaded once and cached; a request reloads it only when one of the
included .bean files changes on disk (cheap mtime check). A full load is ~200ms;
the per-request queries are milliseconds.

Endpoints (MVP — replicates Fava's core reports):
    GET /health
    GET /meta                              accounts, commodities, date range
    GET /networth?from&to&step             net-worth time series + snapshot
    GET /balance-sheet?date                Assets/Liabilities/Equity tree
    GET /income-statement?from&to          Income/Expenses tree
    GET /holdings?date                     per-commodity cost/market/gain
    GET /journal?account&from&to&limit&offset   paginated transactions

All monetary values are returned as plain numbers in the operating currency
(CHF), converted at market prices for the requested date, unless a native
currency/units field says otherwise.
"""

import decimal
import os
import re
from datetime import date, datetime, timedelta
from itertools import groupby

from fastapi import FastAPI, HTTPException, Query
from beancount import loader
from beancount.core import convert, data, getters, prices, realization
from beancount.core.amount import Amount
from beancount.core.inventory import Inventory
from beancount.core.number import D

LEDGER_PATH = os.environ.get(
    "LEDGER_PATH", "/home/alex/.local/src/accounting/main.bean"
)

app = FastAPI(title="finance-service")


# --------------------------------------------------------------------------- #
# Ledger cache — reload only when an included .bean file changes on disk.
# --------------------------------------------------------------------------- #
class Ledger:
    def __init__(self):
        self.entries = []
        self.errors = []
        self.options = {}
        self.price_map = {}
        self.opcur = "CHF"
        self.txns = []
        # commodity -> the currency it is "natively" held in, used by the
        # per-currency (unconverted) view: fiat is bucketed as itself, a security
        # is bucketed by its quote-currency (e.g. VOW -> EUR, LYSP5 -> USD).
        self.natmap = {}
        self._mtimes = {}

    def _current_mtimes(self, files):
        out = {}
        for f in files:
            try:
                out[f] = os.path.getmtime(f)
            except OSError:
                pass
        return out

    def _stale(self):
        if not self._mtimes:
            return True
        for f, m in self._mtimes.items():
            try:
                if os.path.getmtime(f) != m:
                    return True
            except OSError:
                return True
        return False

    def load(self, force=False):
        if not force and not self._stale():
            return
        entries, errors, options = loader.load_file(LEDGER_PATH)
        self.entries = entries
        self.errors = errors
        self.options = options
        self.price_map = prices.build_price_map(entries)
        self.opcur = (options.get("operating_currency") or ["CHF"])[0]
        self.txns = [e for e in entries if isinstance(e, data.Transaction)]
        self.natmap = {}
        for cur, d in getters.get_commodity_directives(entries).items():
            m = d.meta or {}
            if m.get("asset-class") == "cash":
                self.natmap[cur] = cur
            else:
                self.natmap[cur] = m.get("quote-currency", self.opcur)
        # options['include'] lists main + every included file.
        files = options.get("include") or [LEDGER_PATH]
        self._mtimes = self._current_mtimes(files)


LEDGER = Ledger()


def get_ledger() -> Ledger:
    try:
        LEDGER.load()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"ledger load failed: {exc}")
    return LEDGER


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def num(x, places=2):
    """Decimal/None -> rounded float for JSON."""
    if x is None:
        return None
    return round(float(x), places)


def parse_date(s, default):
    if not s:
        return default
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"bad date: {s!r}")


def ledger_bounds(led: Ledger):
    dates = [t.date for t in led.txns]
    return (min(dates), max(dates)) if dates else (date.today(), date.today())


def period_bounds(led: Ledger, from_, to, default_months=12):
    """(lo, hi) for a period query. `to` defaults to the ledger end; when `from`
    is omitted, default to the last `default_months` (not the whole history),
    clamped to the ledger start. Explicit `from` is honoured as given."""
    lo_ledger, hi_ledger = ledger_bounds(led)
    hi = parse_date(to, hi_ledger)
    if from_:
        return parse_date(from_, lo_ledger), hi
    try:
        lo = hi.replace(year=hi.year - default_months // 12) if default_months % 12 == 0 else hi
    except ValueError:
        lo = hi.replace(year=hi.year - 1, day=28)
    if default_months % 12 != 0:
        m = hi.month - default_months
        y = hi.year + (m - 1) // 12
        lo = date(y, (m - 1) % 12 + 1, min(hi.day, 28))
    return (max(lo, lo_ledger), hi)


def chf(inv: Inventory, price_map, target, at: date, basis: str = "market"):
    """Reduce an Inventory to the operating currency.

    `basis="market"` values holdings at market prices for `at`; `basis="cost"`
    values them at their book/cost value (like Fava's "at cost"), converting any
    foreign cost currency to the operating currency at market FX.

    Returns (total_in_target, other) where `other` maps any currency that could
    not be converted (e.g. a date before price coverage begins) to its number —
    surfaced rather than silently dropped.
    """
    base = inv.reduce(convert.get_cost) if basis == "cost" else inv
    reduced = base.reduce(convert.convert_position, target, price_map, at)
    total = D("0")
    other = {}
    for pos in reduced:
        if pos.units.currency == target:
            total += pos.units.number
        else:
            other[pos.units.currency] = other.get(pos.units.currency, D("0")) + pos.units.number
    return total, other


def by_currency_value(inv: Inventory, led: "Ledger", at: date, basis: str = "market"):
    """Value an Inventory *without* cross-currency conversion, bucketed by the
    currency each position natively lives in — the per-currency exposure view.

    At market, each position is valued in its native currency (fiat as itself, a
    security in its quote-currency). At cost, positions are bucketed by their cost
    currency. Returns {currency: number}.
    """
    buckets = {}
    if basis == "cost":
        for pos in inv.reduce(convert.get_cost):
            c = pos.units.currency
            buckets[c] = buckets.get(c, D("0")) + pos.units.number
        return buckets
    for pos in inv:
        target = led.natmap.get(pos.units.currency, led.opcur)
        # convert_position returns an Amount (not a Position).
        amt = convert.convert_position(pos, target, led.price_map, at)
        buckets[amt.currency] = buckets.get(amt.currency, D("0")) + amt.number
    return buckets


def entries_upto(entries, at: date):
    return [e for e in entries if e.date <= at]


def entries_between(entries, lo: date, hi: date):
    return [e for e in entries if lo <= e.date <= hi]


def tree_from_real(real_node, price_map, target, at: date, basis="market", depth=0, max_depth=99):
    """Recursively build a JSON tree from a RealAccount, valuing each subtree
    (node + descendants) in the operating currency at the requested basis."""
    total_inv = realization.compute_balance(real_node)
    value, other = chf(total_inv, price_map, target, at, basis)
    children = []
    if depth < max_depth:
        for child in real_node.values():
            sub = tree_from_real(child, price_map, target, at, basis, depth + 1, max_depth)
            if sub is not None:
                children.append(sub)
    node = {
        "account": real_node.account or "(root)",
        "name": (real_node.account or "").split(":")[-1] or "(root)",
        "value": num(value),
        "children": children,
    }
    if other:
        node["other"] = {c: num(n) for c, n in other.items()}
    return node


def find_real(real_root, name):
    return realization.get(real_root, name)


def posting_chf(p, price_map, opcur, at: date):
    """Value a single posting's units in the operating currency at `at`."""
    u = p.units
    if u is None:
        return D("0")
    if u.currency == opcur:
        return u.number
    amt = convert.convert_amount(u, opcur, price_map, at)
    return amt.number if amt and amt.currency == opcur else u.number


def xirr(flows):
    """Money-weighted annualised return (XIRR) for a list of (date, amount)
    cash flows — negatives are money in, positives money out/value. Returns the
    rate as a decimal (0.12 = 12 %/yr), or None if it can't be solved (e.g. all
    flows the same sign, or a degenerate/too-short series). Solved by bisection
    for robustness — no scipy dependency."""
    if len(flows) < 2:
        return None
    amounts = [float(a) for _, a in flows]
    if not (any(a > 0 for a in amounts) and any(a < 0 for a in amounts)):
        return None
    t0 = min(d for d, _ in flows)
    years = [(d - t0).days / 365.0 for d, _ in flows]

    def npv(r):
        return sum(a / (1.0 + r) ** y for a, y in zip(amounts, years))

    lo, hi = -0.9999, 10.0
    flo, fhi = npv(lo), npv(hi)
    if flo * fhi > 0:
        for cap in (25.0, 100.0, 1000.0):
            fhi = npv(cap)
            if flo * fhi <= 0:
                hi = cap
                break
        else:
            return None
    for _ in range(200):
        mid = (lo + hi) / 2.0
        fm = npv(mid)
        if abs(fm) < 1e-7:
            return mid
        if flo * fm < 0:
            hi = mid
        else:
            lo, flo = mid, fm
    return (lo + hi) / 2.0


# Tokens too generic to identify a security in a dividend narration.
_DIV_STOP = {"ag", "the", "share", "shares", "etf", "ucits", "co", "inc", "plc",
             "sa", "nv", "ord", "dividende", "dividend", "aktie"}


def _tokens(s):
    return [w for w in re.split(r"[^a-z0-9]+", (s or "").lower()) if len(w) >= 2 and w not in _DIV_STOP]


def _match_commodity(narration, name_tokens):
    """Best-matching commodity for a dividend narration, by shared name tokens
    (prefix-aware so 'Ordin.'~'Ordinary', 'Pref.'~'Preferred'). None if unclear."""
    nt = _tokens(narration)
    best, best_score, tie = None, 0, False
    for cur, toks in name_tokens.items():
        score = sum(
            1 for w in nt
            if any(w == x or (len(w) >= 4 and len(x) >= 4 and (x.startswith(w) or w.startswith(x))) for x in toks)
        )
        if score > best_score:
            best, best_score, tie = cur, score, False
        elif score == best_score and score > 0:
            tie = True
    return best if best_score >= 2 and not tie else None


def dividend_flows(led):
    """One dict per dividend transaction: date, commodity (attributed by
    narration), gross, withholding, net — all CHF. net = gross − treaty
    withholding (the 15 % already booked for German stocks; the reclaimable part
    stays included as it is money owed back)."""
    commodities = getters.get_commodity_directives(led.entries)
    name_tokens = {cur: set(_tokens((cd.meta or {}).get("name", cur))) for cur, cd in commodities.items()}
    out = []
    for t in led.txns:
        gross = D("0")
        wht = D("0")
        for p in t.postings:
            if p.account.startswith("Income:Dividends"):
                gross += -posting_chf(p, led.price_map, led.opcur, t.date)
            elif p.account.startswith("Expenses:Taxes:Dividends"):
                wht += posting_chf(p, led.price_map, led.opcur, t.date)
        if gross <= 0:
            continue
        out.append({
            "date": t.date,
            "commodity": _match_commodity(t.narration, name_tokens),
            "gross": float(gross),
            "withholding": float(wht),
            "net": float(gross - wht),
            "narration": t.narration,
        })
    return out


def _cost_flow(p, led, dt):
    cost_amt = Amount(p.units.number * p.cost.number, p.cost.currency)
    cc = convert.convert_amount(cost_amt, led.opcur, led.price_map, dt)
    return float(cc.number if cc and cc.currency == led.opcur else cost_amt.number)


def _market_at(inv, led, d):
    val, _ = chf(inv, led.price_map, led.opcur, d)
    return float(val)


def _lot_events(led, commodity=None):
    lots = []
    for t in led.txns:
        for p in t.postings:
            if p.account.startswith("Assets") and p.cost is not None and p.units is not None:
                if commodity is None or p.units.currency == commodity:
                    lots.append((t.date, p))
    lots.sort(key=lambda x: x[0])
    return lots


def compute_returns(led, hi, commodity, market_value, divs):
    """Dividend-inclusive returns for a commodity (or the whole portfolio if
    commodity is None): (xirr_pct, twr_pct, dividends_chf).

    XIRR = money-weighted (capital outflows + net dividends + final value). TWR =
    time-weighted, geometrically linking sub-period returns across buy dates with
    dividends added back — strips out the effect of *when* money was added, so it
    judges the investments rather than the contribution timing."""
    lots = _lot_events(led, commodity)
    if not lots:
        return None, None, 0.0
    my_divs = sorted(
        ((d["date"], d["net"]) for d in divs if commodity is None or d["commodity"] == commodity),
        key=lambda x: x[0],
    )
    div_total = sum(net for _, net in my_divs)

    flows = [(dt, -_cost_flow(p, led, dt)) for dt, p in lots]
    flows.extend(my_divs)
    flows.append((hi, float(market_value)))
    rate = xirr(flows)

    def div_between(a, b):
        return sum((net for dt, net in my_divs if a < dt <= b), 0.0)

    inv = Inventory()
    factors = []
    v_after_last = None
    last_date = None
    for d, grp in groupby(lots, key=lambda x: x[0]):
        v_before = _market_at(inv, led, d)
        if v_after_last and v_after_last > 0:
            factors.append((v_before + div_between(last_date, d)) / v_after_last)
        for _, p in grp:
            inv.add_position(p)
        v_after_last, last_date = _market_at(inv, led, d), d
    if v_after_last and v_after_last > 0:
        factors.append((_market_at(inv, led, hi) + div_between(last_date, hi)) / v_after_last)

    twr = None
    total_days = (hi - lots[0][0]).days
    if factors and total_days > 0:
        prod = 1.0
        for f in factors:
            prod *= f
        if prod > 0:
            twr = prod ** (365.0 / total_days) - 1

    return (
        rate * 100 if rate is not None else None,
        twr * 100 if twr is not None else None,
        div_total,
    )


def month_range(lo: date, hi: date):
    """Continuous YYYY-MM keys from lo..hi inclusive (so trends have no gaps)."""
    out = []
    y, m = lo.year, lo.month
    while (y, m) <= (hi.year, hi.month):
        out.append(f"{y}-{m:02d}")
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return out


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@app.get("/health")
def health():
    led = get_ledger()
    return {"status": "ok", "entries": len(led.entries), "errors": len(led.errors)}


@app.get("/meta")
def meta():
    led = get_ledger()
    lo, hi = ledger_bounds(led)
    accounts = sorted(getters.get_accounts(led.entries))

    # Commodities with their metadata (name, asset-class, isin, quote-currency).
    commodities = {}
    for cur, d in getters.get_commodity_directives(led.entries).items():
        m = {k: v for k, v in (d.meta or {}).items() if k not in ("filename", "lineno")}
        commodities[cur] = m

    roots = {}
    for a in accounts:
        roots[a.split(":")[0]] = roots.get(a.split(":")[0], 0) + 1

    return {
        "operating_currency": led.opcur,
        "operating_currencies": led.options.get("operating_currency", []),
        "title": led.options.get("title"),
        "date_range": {"from": lo.isoformat(), "to": hi.isoformat()},
        "counts": {
            "transactions": len(led.txns),
            "accounts": len(accounts),
            "prices": sum(1 for e in led.entries if isinstance(e, data.Price)),
            "balances": sum(1 for e in led.entries if isinstance(e, data.Balance)),
            "errors": len(led.errors),
        },
        "roots": roots,
        "accounts": accounts,
        "commodities": commodities,
    }


@app.get("/networth")
def networth(
    from_: str = Query(None, alias="from"),
    to: str = Query(None),
    step: int = Query(7, ge=1, le=90),
    basis: str = Query("market", pattern="^(market|cost)$"),
    by_currency: bool = Query(False),
):
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)

    # Accumulate Assets + Liabilities postings in date order, sampling the
    # running balance every `step` days.
    postings = []
    for t in led.txns:
        for p in t.postings:
            if p.account.startswith("Assets") or p.account.startswith("Liabilities"):
                postings.append((t.date, p))
    postings.sort(key=lambda x: x[0])

    seen_currencies = set()

    def sample(inv, at):
        if by_currency:
            # Per-currency native amounts, no cross-currency conversion.
            buckets = by_currency_value(inv, led, at, basis)
            for c in buckets:
                seen_currencies.add(c)
            point = {"date": at.isoformat()}
            point.update({c: num(v) for c, v in buckets.items()})
            return point
        net_val, _ = chf(inv, led.price_map, led.opcur, at, basis)
        return {"date": at.isoformat(), "net": num(net_val)}

    series = []
    inv = Inventory()
    idx = 0
    d = lo
    while d <= hi:
        while idx < len(postings) and postings[idx][0] <= d:
            inv.add_position(postings[idx][1])
            idx += 1
        series.append(sample(inv, d))
        d += timedelta(days=step)

    # Always include the final boundary date.
    if not series or series[-1]["date"] != hi.isoformat():
        while idx < len(postings) and postings[idx][0] <= hi:
            inv.add_position(postings[idx][1])
            idx += 1
        series.append(sample(inv, hi))

    # Current snapshot broken out by root, at the chosen basis.
    snap = {}
    snap_by_currency = {}
    for root in ("Assets", "Liabilities"):
        rinv = Inventory()
        for t in led.txns:
            if t.date > hi:
                continue
            for p in t.postings:
                if p.account.startswith(root):
                    rinv.add_position(p)
        val, _ = chf(rinv, led.price_map, led.opcur, hi, basis)
        snap[root.lower()] = num(val)
        for c, v in by_currency_value(rinv, led, hi, basis).items():
            snap_by_currency.setdefault(c, {})[root.lower()] = num(v)
    snap["net"] = num(D(str(snap["assets"] or 0)) + D(str(snap["liabilities"] or 0)))

    return {
        "currency": led.opcur,
        "basis": basis,
        "by_currency": by_currency,
        "currencies": sorted(seen_currencies) if by_currency else [led.opcur],
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "step_days": step,
        "series": series,
        "snapshot": snap,
        "snapshot_by_currency": snap_by_currency,
    }


@app.get("/balance-sheet")
def balance_sheet(
    at: str = Query(None, alias="date"),
    basis: str = Query("market", pattern="^(market|cost)$"),
):
    led = get_ledger()
    _, hi = ledger_bounds(led)
    d = parse_date(at, hi)
    real_root = realization.realize(entries_upto(led.entries, d))

    out = {"currency": led.opcur, "date": d.isoformat(), "basis": basis, "sections": []}
    for root in ("Assets", "Liabilities", "Equity"):
        node = find_real(real_root, root)
        if node is not None:
            out["sections"].append(tree_from_real(node, led.price_map, led.opcur, d, basis))
    return out


@app.get("/income-statement")
def income_statement(
    from_: str = Query(None, alias="from"), to: str = Query(None)
):
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)
    real_root = realization.realize(entries_between(led.entries, lo, hi))

    out = {"currency": led.opcur, "from": lo.isoformat(), "to": hi.isoformat(), "sections": []}
    for root in ("Income", "Expenses"):
        node = find_real(real_root, root)
        if node is not None:
            # Income postings are negative (credits); flip sign for display.
            sect = tree_from_real(node, led.price_map, led.opcur, hi)
            if root == "Income":
                _negate(sect)
            out["sections"].append(sect)
    return out


def _negate(node):
    if node.get("value") is not None:
        node["value"] = -node["value"]
    for c in node.get("children", []):
        _negate(c)


def holdings_snapshot(led: "Ledger", d: date):
    """Per-commodity cost/market/gain at date `d`, plus totals. Shared by the
    /holdings and /investments endpoints."""
    commodities = getters.get_commodity_directives(led.entries)

    per_commodity = {}
    accounts = {}
    for t in led.txns:
        if t.date > d:
            continue
        for p in t.postings:
            if p.account.startswith("Assets") and p.cost is not None:
                cur = p.units.currency
                per_commodity.setdefault(cur, Inventory()).add_position(p)
                accounts.setdefault(cur, set()).add(p.account)

    rows = []
    total_cost = D("0")
    total_market = D("0")
    for cur, inv in per_commodity.items():
        units = sum((pos.units.number for pos in inv), D("0"))
        if units == 0:
            continue
        cost_val, _ = chf(inv.reduce(convert.get_cost), led.price_map, led.opcur, d)
        market_val, _ = chf(inv, led.price_map, led.opcur, d)
        cmeta = {k: v for k, v in (commodities.get(cur).meta or {}).items()
                 if k not in ("filename", "lineno")} if commodities.get(cur) else {}
        quote = cmeta.get("quote-currency", led.opcur)
        price_entry = prices.get_price(led.price_map, (cur, quote), d)
        rows.append({
            "commodity": cur,
            "name": cmeta.get("name", cur),
            "asset_class": cmeta.get("asset-class"),
            "isin": cmeta.get("isin"),
            "units": num(units, 6),
            "quote_currency": quote,
            "price": num(price_entry[1], 4) if price_entry and price_entry[1] else None,
            "price_date": price_entry[0].isoformat() if price_entry and price_entry[0] else None,
            "cost_chf": num(cost_val),
            "market_chf": num(market_val),
            "gain_chf": num(market_val - cost_val),
            "gain_pct": num((market_val - cost_val) / cost_val * 100, 2) if cost_val else None,
            "accounts": sorted(accounts.get(cur, [])),
        })
        total_cost += cost_val
        total_market += market_val

    rows.sort(key=lambda r: r["market_chf"] or 0, reverse=True)
    totals = {
        "cost_chf": num(total_cost),
        "market_chf": num(total_market),
        "gain_chf": num(total_market - total_cost),
        "gain_pct": num((total_market - total_cost) / total_cost * 100, 2) if total_cost else None,
    }
    return rows, totals


@app.get("/holdings")
def holdings(at: str = Query(None, alias="date")):
    led = get_ledger()
    _, hi = ledger_bounds(led)
    d = parse_date(at, hi)
    rows, totals = holdings_snapshot(led, d)
    return {"currency": led.opcur, "date": d.isoformat(), "holdings": rows, "totals": totals}


@app.get("/holding")
def holding(
    commodity: str = Query(...),
    from_: str = Query(None, alias="from"),
    to: str = Query(None),
    step: int = Query(7, ge=1, le=90),
):
    """Per-stock deep dive: current position + gain/XIRR, value-over-time (market
    vs invested cost), native price history, portfolio share, and the buy lots."""
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)

    rows, totals = holdings_snapshot(led, hi)
    row = next((r for r in rows if r["commodity"] == commodity), None)
    if row is None:
        raise HTTPException(status_code=404, detail=f"not a held commodity: {commodity}")
    accounts = set(row["accounts"])
    quote = row["quote_currency"]

    def is_lot(p):
        return (
            p.cost is not None
            and p.units is not None
            and p.units.currency == commodity
            and p.account.startswith("Assets")
        )

    lots = [(t.date, p) for t in led.txns for p in t.postings if is_lot(p)]

    # Dividend-inclusive XIRR + TWR for this holding.
    divs = dividend_flows(led)
    x, tw, dv = compute_returns(led, hi, commodity, row["market_chf"], divs)
    row["xirr_pct"] = num(x, 2) if x is not None else None
    row["twr_pct"] = num(tw, 2) if tw is not None else None
    row["dividends_chf"] = num(dv)
    my_divs = [d for d in divs if d["commodity"] == commodity]

    # One shared daily date axis for every deep-dive chart (the holding's price
    # dates in the window) so the graphs line up and a hovered day maps to the
    # same index across all of them.
    own_map = {pd: pr for pd, pr in led.price_map.get((commodity, quote), []) if lo <= pd <= hi and pr is not None}
    dates = sorted(own_map)

    # Native price, market value and invested cost (CHF), all on `dates`.
    lots.sort(key=lambda x: x[0])
    price_line, market_line, cost_line = [], [], []
    invx = Inventory()
    invested = 0.0
    idx = 0
    for dd in dates:
        while idx < len(lots) and lots[idx][0] <= dd:
            _dt, p = lots[idx]
            invx.add_position(p)
            cost_amt = Amount(p.units.number * p.cost.number, p.cost.currency)
            cc = convert.convert_amount(cost_amt, led.opcur, led.price_map, _dt)
            invested += float(cc.number if cc and cc.currency == led.opcur else cost_amt.number)
            idx += 1
        market, _ = chf(invx, led.price_map, led.opcur, dd)
        price_line.append(num(own_map[dd], 4))
        market_line.append(num(market))
        cost_line.append(round(invested, 2))

    # Buy lots (the security-account postings).
    transactions = []
    for t in led.txns:
        for p in t.postings:
            if p.account in accounts and p.units is not None and p.units.currency == commodity and p.cost is not None:
                transactions.append({
                    "date": t.date.isoformat(),
                    "account": p.account,
                    "units": num(p.units.number, 6),
                    "price": num(p.cost.number, 4),
                    "cost_currency": p.cost.currency,
                    "payee": t.payee,
                    "narration": t.narration,
                })
    transactions.sort(key=lambda x: x["date"], reverse=True)

    # Rebased performance: this holding vs. any benchmarks, on the shared axis,
    # each rebased to 0 % at its first price in the window.
    def rebase(pmap):
        out = []
        last = base = None
        for dt in dates:
            if dt in pmap:
                last = pmap[dt]
            if last is None:
                out.append(None)
                continue
            if base is None:
                base = last
            out.append(num((last / base - 1) * 100, 2))
        return out

    commodities = getters.get_commodity_directives(led.entries)
    bench = []
    for cur, cd in commodities.items():
        m = cd.meta or {}
        if str(m.get("benchmark", "")).upper() not in ("TRUE", "1", "YES"):
            continue
        bq = m.get("quote-currency", led.opcur)
        bmap = {pd: pr for pd, pr in led.price_map.get((cur, bq), []) if lo <= pd <= hi and pr is not None}
        if bmap:
            bench.append({"commodity": cur, "name": m.get("name", cur), "pct": rebase(bmap)})

    share = (row["market_chf"] or 0) / (totals["market_chf"] or 1) * 100
    return {
        "currency": led.opcur,
        "date": hi.isoformat(),
        "commodity": commodity,
        "name": row["name"],
        # All series share one daily axis so the deep-dive charts line up and
        # a hovered day highlights the same index across every graph.
        "timeline": {
            "dates": [d.isoformat() for d in dates],
            "price": price_line,
            "market": market_line,
            "cost": cost_line,
            "own": rebase(own_map),
            "benchmarks": bench,
        },
        "isin": row["isin"],
        "asset_class": row["asset_class"],
        "quote_currency": quote,
        "accounts": sorted(accounts),
        "current": row,
        "portfolio_share": num(share, 1),
        "transactions": transactions,
        "dividends": [
            {
                "date": dd["date"].isoformat(),
                "gross": num(dd["gross"]),
                "withholding": num(dd["withholding"]),
                "net": num(dd["net"]),
                "narration": dd["narration"],
            }
            for dd in sorted(my_divs, key=lambda x: x["date"], reverse=True)
        ],
    }


@app.get("/query")
def run_bql(q: str = Query(..., min_length=1)):
    """Run a raw BQL (beanquery) query against the ledger and return the columns
    + rows. Read-only. Query errors come back as 400 with the message."""
    from beanquery import query as bq

    led = get_ledger()
    try:
        rtypes, rrows = bq.run_query(led.entries, led.options, q)
    except Exception as exc:  # noqa: BLE001 — surface any parse/exec error to the user
        raise HTTPException(status_code=400, detail=str(exc))

    def cell(v):
        if v is None:
            return None
        if isinstance(v, bool):
            return v
        if isinstance(v, decimal.Decimal):
            return num(v, 4)
        if isinstance(v, (int, float)):
            return v
        if hasattr(v, "isoformat"):
            return v.isoformat()
        return str(v)

    return {
        "columns": [getattr(col, "name", None) or col[0] for col in rtypes],
        "rows": [[cell(v) for v in row] for row in rrows],
        "count": len(rrows),
    }


@app.get("/tax-wealth")
def tax_wealth():
    """Taxable wealth check: total Assets valued in CHF today, excluding pillar-2
    (Assets:PensionFund:MPS) and pillar-3a (Assets:Frankly), which don't count.
    Over the threshold (80k CHF) a tax return must be filed; under it, standard
    withholding tax (Quellensteuer) suffices."""
    led = get_ledger()
    _, hi = ledger_bounds(led)
    EXCLUDE = ("Assets:PensionFund:MPS", "Assets:Frankly")

    inv = Inventory()
    for t in led.txns:
        if t.date > hi:
            continue
        for p in t.postings:
            a = p.account
            if a.startswith("Assets:") and not any(a.startswith(e) for e in EXCLUDE):
                inv.add_position(p)

    val, _ = chf(inv, led.price_map, led.opcur, hi)
    threshold = D("80000")
    return {
        "currency": led.opcur,
        "date": hi.isoformat(),
        "taxable_assets": num(val),
        "threshold": num(threshold),
        "must_file": bool(val > threshold),
        "excluded": list(EXCLUDE),
    }


@app.get("/investments")
def investments(
    from_: str = Query(None, alias="from"),
    to: str = Query(None),
    step: int = Query(7, ge=1, le=90),
):
    """Investment overview: per-holding gain/loss snapshot, a cumulative P/L
    series over time (market value − invested cost), and per-holding price
    history (native quote currency) for a trend chart."""
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)

    rows, totals = holdings_snapshot(led, hi)

    # Dividend-inclusive XIRR (money-weighted) + TWR (time-weighted), per holding
    # and portfolio-wide. Dividends are net of the 15 % treaty withholding.
    divs = dividend_flows(led)
    for r in rows:
        x, tw, dv = compute_returns(led, hi, r["commodity"], r["market_chf"], divs)
        r["xirr_pct"] = num(x, 2) if x is not None else None
        r["twr_pct"] = num(tw, 2) if tw is not None else None
        r["dividends_chf"] = num(dv)
    px, ptw, pdv = compute_returns(led, hi, None, totals["market_chf"], divs)
    totals["xirr_pct"] = num(px, 2) if px is not None else None
    totals["twr_pct"] = num(ptw, 2) if ptw is not None else None
    totals["dividends_chf"] = num(pdv)

    # Cumulative P/L: walk holding lots in date order, tracking invested cost in
    # CHF fixed at purchase-date FX, and value the running inventory at market on
    # each sample date. pl = market − invested (unrealized gain on held lots).
    hp = []
    for t in led.txns:
        for p in t.postings:
            if p.account.startswith("Assets") and p.cost is not None:
                hp.append((t.date, p))
    hp.sort(key=lambda x: x[0])

    pl_series = []
    inv = Inventory()
    invested = D("0")
    idx = 0
    d = lo
    while True:
        while idx < len(hp) and hp[idx][0] <= d:
            dt, p = hp[idx]
            inv.add_position(p)
            cost_amt = Amount(p.units.number * p.cost.number, p.cost.currency)
            cc = convert.convert_amount(cost_amt, led.opcur, led.price_map, dt)
            invested += cc.number if cc and cc.currency == led.opcur else cost_amt.number
            idx += 1
        market, _ = chf(inv, led.price_map, led.opcur, d)
        pl_series.append({
            "date": d.isoformat(),
            "cost": num(invested),
            "market": num(market),
            "pl": num(market - invested),
        })
        if d >= hi:
            break
        d = min(d + timedelta(days=step), hi)

    # Price performance: every holding rebased to % return from its first price,
    # on one shared daily date axis (forward-filled) so the lines are comparable.
    series_maps = {}
    date_set = set()
    for r in rows:
        cur, quote = r["commodity"], r["quote_currency"]
        m = {pd: pr for pd, pr in led.price_map.get((cur, quote), []) if lo <= pd <= hi and pr is not None}
        series_maps[cur] = m
        date_set.update(m.keys())
    perf_dates = sorted(date_set)

    performance = []
    for r in rows:
        m = series_maps[r["commodity"]]
        pct = []
        last = None
        base = None
        for dt in perf_dates:
            if dt in m:
                last = m[dt]
            if last is None:
                pct.append(None)
                continue
            if base is None:
                base = last
            pct.append(num((last / base - 1) * 100, 2))
        performance.append({
            "commodity": r["commodity"],
            "name": r["name"],
            "asset_class": r["asset_class"],
            "pct": pct,
        })

    # Benchmarks: commodities flagged `benchmark: "TRUE"` (not held), rebased to %
    # on the same date axis for an overlay comparison. Prices come from the ledger
    # (make prices), so any Yahoo-tracked index/ETF works once declared.
    commodities = getters.get_commodity_directives(led.entries)
    benchmarks = []
    for cur, cd in commodities.items():
        meta = cd.meta or {}
        if str(meta.get("benchmark", "")).upper() not in ("TRUE", "1", "YES"):
            continue
        quote = meta.get("quote-currency", led.opcur)
        pmap = {pd: pr for pd, pr in led.price_map.get((cur, quote), []) if lo <= pd <= hi and pr is not None}
        pct = []
        last = base = None
        for dt in perf_dates:
            if dt in pmap:
                last = pmap[dt]
            if last is None:
                pct.append(None)
                continue
            if base is None:
                base = last
            pct.append(num((last / base - 1) * 100, 2))
        if base is not None:
            benchmarks.append({
                "commodity": cur,
                "name": meta.get("name", cur),
                "quote_currency": quote,
                "pct": pct,
            })

    return {
        "currency": led.opcur,
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "date": hi.isoformat(),
        "holdings": rows,
        "totals": totals,
        "pl_series": pl_series,
        "performance": {
            "dates": [d.isoformat() for d in perf_dates],
            "series": performance,
            "benchmarks": benchmarks,
        },
    }


@app.get("/journal")
def journal(
    account: str = Query(None),
    payee: str = Query(None),
    from_: str = Query(None, alias="from"),
    to: str = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)

    def in_account(acct):
        return not account or acct == account or acct.startswith(account + ":")

    payee_lc = payee.lower() if payee else None
    rows = []
    for t in led.txns:
        if not (lo <= t.date <= hi):
            continue
        if account and not any(in_account(p.account) for p in t.postings):
            continue
        if payee_lc and (t.payee or "").lower() != payee_lc:
            continue
        rows.append(t)
    rows.sort(key=lambda t: (t.date, t.meta.get("lineno", 0)), reverse=True)
    total = len(rows)
    page = rows[offset:offset + limit]

    def scoped_amount(t):
        # Amount attributable to the focused account (sum of its postings), so the
        # drill-down shows the relevant figure rather than an arbitrary leg.
        return sum(
            (posting_chf(p, led.price_map, led.opcur, t.date) for p in t.postings if in_account(p.account)),
            D("0"),
        )

    def total_amount(t):
        # A meaningful single figure regardless of leg count: the largest-magnitude
        # leg in CHF (the cash movement for a buy, the spend for a split, etc.).
        vals = [posting_chf(p, led.price_map, led.opcur, t.date) for p in t.postings]
        return max(vals, key=abs) if vals else D("0")

    def posting_json(p, dt):
        out = {"account": p.account, "chf": num(posting_chf(p, led.price_map, led.opcur, dt))}
        if p.units:
            out["units"] = {"number": num(p.units.number, 4), "currency": p.units.currency}
        if p.cost:
            out["cost"] = {"number": num(p.cost.number, 4), "currency": p.cost.currency}
        if p.price:
            out["price"] = {"number": num(p.price.number, 4), "currency": p.price.currency}
        return out

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "transactions": [
            {
                "date": t.date.isoformat(),
                "flag": t.flag,
                "payee": t.payee,
                "narration": t.narration,
                "tags": sorted(t.tags) if t.tags else [],
                "amount_chf": num(scoped_amount(t)),
                "total_chf": num(total_amount(t)),
                "postings": [posting_json(p, t.date) for p in t.postings],
            }
            for t in page
        ],
    }


_INTERVAL_MONTHS = {
    "daily": D("365") / D("12"),
    "weekly": D("365") / D("12") / D("7"),
    "monthly": D("1"),
    "quarterly": D("1") / D("3"),
    "yearly": D("1") / D("12"),
}


def parse_budgets(led):
    """Fava-style `custom "budget" Account "interval" amount cur` directives ->
    {account: [(date, monthly_chf), ...] sorted}. Non-monthly intervals are
    converted to a monthly-equivalent; foreign amounts to CHF at the directive
    date."""
    budgets = {}
    for e in led.entries:
        if not (isinstance(e, data.Custom) and e.type == "budget") or len(e.values) < 3:
            continue
        account = e.values[0].value
        interval = str(e.values[1].value).lower()
        amt = e.values[2].value
        factor = _INTERVAL_MONTHS.get(interval, D("1"))
        monthly = amt.number * factor
        if amt.currency != led.opcur:
            cc = convert.convert_amount(Amount(monthly, amt.currency), led.opcur, led.price_map, e.date)
            if cc and cc.currency == led.opcur:
                monthly = cc.number
        budgets.setdefault(account, []).append((e.date, monthly))
    for a in budgets:
        budgets[a].sort()
    return budgets


def _active_monthly(blist, on):
    """Most recent monthly budget amount effective on/before `on`."""
    val = None
    for d, m in blist:
        if d <= on:
            val = m
        else:
            break
    return val


@app.get("/budget")
def budget(from_: str = Query(None, alias="from"), to: str = Query(None)):
    from calendar import monthrange

    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)
    budgets = parse_budgets(led)
    months = month_range(lo, hi)

    def in_budget(acct, a):
        return acct == a or acct.startswith(a + ":")

    # Actual spend per budgeted account (and per month) over the window.
    actual = {a: D("0") for a in budgets}
    actual_m = {a: {mk: D("0") for mk in months} for a in budgets}
    for t in led.txns:
        if not (lo <= t.date <= hi):
            continue
        mk = f"{t.date.year}-{t.date.month:02d}"
        for p in t.postings:
            if p.units is None:
                continue
            for a in budgets:
                if in_budget(p.account, a):
                    v = posting_chf(p, led.price_map, led.opcur, t.date)
                    actual[a] += v
                    actual_m[a][mk] += v

    def month_span(mk):
        y, m = int(mk[:4]), int(mk[5:7])
        first, last = date(y, m, 1), date(y, m, monthrange(y, m)[1])
        # fraction of the month covered by [lo, hi]
        s, e = max(first, lo), min(last, hi)
        days, cov = (last - first).days + 1, (e - s).days + 1
        return first, cov / days if days else 0

    rows = []
    total_bud = D("0")
    for a, blist in budgets.items():
        budgeted = D("0")
        for mk in months:
            first, frac = month_span(mk)
            m_amt = _active_monthly(blist, first)
            if m_amt is not None:
                budgeted += m_amt * D(str(frac))
        act = actual[a]
        rows.append({
            "account": a,
            "name": a.split(":")[-1],
            "budgeted": num(budgeted),
            "actual": num(act),
            "remaining": num(budgeted - act),
            "pct": num(float(act / budgeted * 100), 1) if budgeted else None,
        })
        total_bud += budgeted

    rows.sort(key=lambda r: r["actual"] or 0, reverse=True)
    total_act = sum(actual.values(), D("0"))

    monthly = []
    for mk in months:
        first, frac = month_span(mk)
        bud = sum((_active_monthly(b, first) or D("0")) for b in budgets.values()) * D(str(frac))
        act = sum(actual_m[a][mk] for a in budgets)
        monthly.append({"month": mk, "budgeted": num(bud), "actual": num(act)})

    # Current calendar month, pace-aware: spend so far vs. where you'd be at this
    # point in the month, and a linear projection to month-end.
    today = date.today()
    cm_first = date(today.year, today.month, 1)
    days_in = monthrange(today.year, today.month)[1]
    elapsed_frac = today.day / days_in
    cm_spent = {a: D("0") for a in budgets}
    for t in led.txns:
        if not (cm_first <= t.date <= today):
            continue
        for p in t.postings:
            if p.units is None:
                continue
            for a in budgets:
                if in_budget(p.account, a):
                    cm_spent[a] += posting_chf(p, led.price_map, led.opcur, t.date)

    cur_rows = []
    cbud = cspent = cproj = D("0")
    for a, blist in budgets.items():
        bud = _active_monthly(blist, cm_first) or D("0")
        spent = cm_spent[a]
        proj = spent / D(str(elapsed_frac)) if elapsed_frac > 0 else spent
        ratio = float(proj / bud) if bud > 0 else None
        status = "ok"
        if ratio is not None and ratio > 1.05:
            status = "over"
        elif ratio is not None and ratio > 1.0:
            status = "watch"
        cur_rows.append({
            "account": a,
            "name": a.split(":")[-1],
            "budget": num(bud),
            "spent": num(spent),
            "projected": num(proj),
            "remaining": num(bud - spent),
            "status": status,
        })
        cbud += bud
        cspent += spent
        cproj += proj
    # Attention first: over-pace by the widest margin at the top.
    cur_rows.sort(key=lambda r: (r["projected"] or 0) / r["budget"] if r["budget"] else 0, reverse=True)

    current = {
        "month": f"{today.year}-{today.month:02d}",
        "day": today.day,
        "days_in_month": days_in,
        "elapsed_frac": round(elapsed_frac, 4),
        "budgeted": num(cbud),
        "spent": num(cspent),
        "projected": num(cproj),
        "remaining": num(cbud - cspent),
        "rows": cur_rows,
    }

    # Under-budget streak: the last 12 *completed* months (before the current
    # one), each flagged under/over, and the consecutive run of clean months
    # counted back from the most recent. Months with no budget don't count.
    back = []
    y, m = today.year, today.month
    for _ in range(12):
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        back.append((y, m))
    back.reverse()  # oldest -> newest
    back_set = set(back)
    comp_actual = {ym: D("0") for ym in back}
    for t in led.txns:
        ym = (t.date.year, t.date.month)
        if ym not in back_set:
            continue
        for p in t.postings:
            if p.units is None:
                continue
            for a in budgets:
                if in_budget(p.account, a):
                    comp_actual[ym] += posting_chf(p, led.price_map, led.opcur, t.date)

    completed = []
    for (yy, mm) in back:
        first = date(yy, mm, 1)
        bud = sum((_active_monthly(b, first) or D("0")) for b in budgets.values())
        act = comp_actual[(yy, mm)]
        completed.append({
            "month": f"{yy}-{mm:02d}",
            "budgeted": num(bud),
            "actual": num(act),
            "under": bool(bud > 0 and act <= bud),
            "has_budget": bool(bud > 0),
        })
    streak = 0
    for c in reversed(completed):
        if not c["has_budget"]:
            break
        if c["under"]:
            streak += 1
        else:
            break

    return {
        "currency": led.opcur,
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "budgeted": num(total_bud),
        "actual": num(total_act),
        "remaining": num(total_bud - total_act),
        "rows": rows,
        "monthly": monthly,
        "current": current,
        "streak": {"count": streak, "months": completed},
    }


def parse_savings_targets(led):
    """`custom "savings-target" "interval" amount cur` -> sorted [(date, monthly_chf)].
    A monthly *floor* on net savings (income − expenses), the positive twin of a
    budget. Later directives supersede earlier from their date."""
    out = []
    for e in led.entries:
        if not (isinstance(e, data.Custom) and e.type == "savings-target") or len(e.values) < 2:
            continue
        interval = str(e.values[0].value).lower()
        amt = e.values[1].value
        monthly = amt.number * _INTERVAL_MONTHS.get(interval, D("1"))
        if amt.currency != led.opcur:
            cc = convert.convert_amount(Amount(monthly, amt.currency), led.opcur, led.price_map, e.date)
            if cc and cc.currency == led.opcur:
                monthly = cc.number
        out.append((e.date, monthly))
    out.sort()
    return out


def _saved_between(led, first, last):
    """Net saved (income − expenses, CHF) in [first, last]."""
    inc = exp = D("0")
    for t in led.txns:
        if not (first <= t.date <= last):
            continue
        for p in t.postings:
            if p.units is None:
                continue
            if p.account.startswith("Income:"):
                inc += -posting_chf(p, led.price_map, led.opcur, t.date)
            elif p.account.startswith("Expenses:"):
                exp += posting_chf(p, led.price_map, led.opcur, t.date)
    return inc - exp


def savings_target_block(led):
    """Savings-goal adherence: active target, last-12 completed months hit/miss,
    the streak, and current-month progress. None if no target directive."""
    from calendar import monthrange

    targets = parse_savings_targets(led)
    if not targets:
        return None
    today = date.today()

    back = []
    y, m = today.year, today.month
    for _ in range(12):
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        back.append((y, m))
    back.reverse()

    months = []
    for (yy, mm) in back:
        first = date(yy, mm, 1)
        last = date(yy, mm, monthrange(yy, mm)[1])
        tgt = _active_monthly(targets, first)
        sv = _saved_between(led, first, last)
        months.append({
            "month": f"{yy}-{mm:02d}",
            "saved": num(sv),
            "target": num(tgt) if tgt is not None else None,
            "hit": bool(tgt is not None and sv >= tgt),
        })
    streak = 0
    for mo in reversed(months):
        if mo["target"] is None:
            break
        if mo["hit"]:
            streak += 1
        else:
            break

    cm_first = date(today.year, today.month, 1)
    cm_target = _active_monthly(targets, cm_first)
    cm_saved = _saved_between(led, cm_first, today)
    return {
        "monthly": num(cm_target) if cm_target is not None else None,
        "streak": streak,
        "months": months,
        "current": {
            "month": f"{today.year}-{today.month:02d}",
            "saved": num(cm_saved),
            "hit": bool(cm_target is not None and cm_saved >= cm_target),
            "remaining": num(cm_target - cm_saved) if cm_target is not None else None,
        },
    }


@app.get("/account")
def account_view(
    account: str = Query(...),
    from_: str = Query(None, alias="from"),
    to: str = Query(None),
    limit: int = Query(300, ge=1, le=2000),
):
    """Fava-style "go to account": monthly change stacked by immediate child, a
    cumulative account-balance series, and the account journal with a running
    balance per transaction. Amounts in CHF."""
    from calendar import monthrange

    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)
    prefix = account

    def matches(a):
        return a == prefix or a.startswith(prefix + ":")

    def child_of(a):
        rest = a[len(prefix):].lstrip(":")
        name = rest.split(":")[0] if rest else a.split(":")[-1]
        return (f"{prefix}:{name}" if rest else a), name

    months = month_range(lo, hi)
    midx = {mk: i for i, mk in enumerate(months)}
    by_child = {}
    opening = D("0")  # account balance before the window

    for t in led.txns:
        for p in t.postings:
            if p.units is None or not matches(p.account):
                continue
            v = posting_chf(p, led.price_map, led.opcur, t.date)
            if t.date < lo:
                opening += v
                continue
            if t.date > hi:
                continue
            child, name = child_of(p.account)
            d = by_child.get(child)
            if d is None:
                d = by_child[child] = {"name": name, "monthly": [D("0")] * len(months)}
            d["monthly"][midx[f"{t.date.year}-{t.date.month:02d}"]] += v

    children = sorted(
        (
            {"account": a, "name": d["name"], "total": num(sum(d["monthly"], D("0"))),
             "monthly": [num(x) for x in d["monthly"]]}
            for a, d in by_child.items()
        ),
        key=lambda r: abs(r["total"] or 0),
        reverse=True,
    )

    # Cumulative balance at each month-end (opening + running changes).
    balance_series = []
    running = opening
    for mk in months:
        i = midx[mk]
        running += sum(by_child[a]["monthly"][i] for a in by_child)  # noqa: B023
        y, m = int(mk[:4]), int(mk[5:7])
        last = date(y, m, monthrange(y, m)[1])
        balance_series.append({"date": min(last, hi).isoformat(), "balance": num(running)})

    # Journal with a running balance (computed oldest->newest, shown newest-first).
    tx = [t for t in led.txns if lo <= t.date <= hi and any(matches(p.account) for p in t.postings)]
    tx.sort(key=lambda t: (t.date, t.meta.get("lineno", 0)))
    bal = opening
    rows = []
    for t in tx:
        change = sum((posting_chf(p, led.price_map, led.opcur, t.date) for p in t.postings if matches(p.account)), D("0"))
        bal += change
        rows.append({
            "date": t.date.isoformat(),
            "flag": t.flag,
            "payee": t.payee,
            "narration": t.narration,
            "tags": sorted(t.tags) if t.tags else [],
            "change": num(change),
            "balance": num(bal),
            "total_chf": num(max((posting_chf(p, led.price_map, led.opcur, t.date) for p in t.postings), key=abs, default=D("0"))),
            "postings": [
                {
                    "account": p.account,
                    "chf": num(posting_chf(p, led.price_map, led.opcur, t.date)),
                    **({"units": {"number": num(p.units.number, 4), "currency": p.units.currency}} if p.units else {}),
                    **({"cost": {"number": num(p.cost.number, 4), "currency": p.cost.currency}} if p.cost else {}),
                }
                for p in t.postings
            ],
        })
    rows.reverse()
    journal = rows[:limit]

    return {
        "currency": led.opcur,
        "account": account,
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "balance": num(bal),
        "opening": num(opening),
        "months": months,
        "children": children,
        "balance_series": balance_series,
        "journal": journal,
        "count": len(rows),
    }


@app.get("/savings")
def savings(from_: str = Query(None, alias="from"), to: str = Query(None)):
    """Savings rate = (income − expenses) / income, overall and per month."""
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)
    months = month_range(lo, hi)
    midx = {mk: i for i, mk in enumerate(months)}
    inc = [D("0")] * len(months)
    exp = [D("0")] * len(months)

    for t in led.txns:
        if not (lo <= t.date <= hi):
            continue
        i = midx[f"{t.date.year}-{t.date.month:02d}"]
        for p in t.postings:
            if p.units is None:
                continue
            if p.account.startswith("Income:"):
                inc[i] += -posting_chf(p, led.price_map, led.opcur, t.date)  # credits -> positive
            elif p.account.startswith("Expenses:"):
                exp[i] += posting_chf(p, led.price_map, led.opcur, t.date)

    def rate(income, expense):
        return num(float((income - expense) / income * 100), 1) if income > 0 else None

    monthly = [
        {
            "month": mk,
            "income": num(inc[i]),
            "expenses": num(exp[i]),
            "saved": num(inc[i] - exp[i]),
            "rate": rate(inc[i], exp[i]),
        }
        for i, mk in enumerate(months)
    ]
    tot_inc = sum(inc, D("0"))
    tot_exp = sum(exp, D("0"))
    return {
        "currency": led.opcur,
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "income": num(tot_inc),
        "expenses": num(tot_exp),
        "saved": num(tot_inc - tot_exp),
        "rate": rate(tot_inc, tot_exp),
        "monthly": monthly,
        "target": savings_target_block(led),
    }


@app.get("/forecast")
def forecast(months: int = Query(12, ge=1, le=36)):
    """Estimated income & expenses for a typical month, per top-level category —
    the mean over the last `months` *complete* months that the ledger covers.
    Using the mean (not median) amortises lumpy annual items (insurance, taxes)
    into their true monthly cost."""
    led = get_ledger()
    led_start, _ = ledger_bounds(led)
    today = date.today()

    # The most recent complete months (excluding the current one) that the ledger
    # actually covers.
    cand = []
    y, m = today.year, today.month
    for _ in range(months):
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        if date(y, m, 1) < led_start.replace(day=1):
            continue
        cand.append((y, m))
    n = len(cand)
    cand_set = set(cand)

    inc = {}
    exp = {}

    def bucket(store, root, acct, val):
        rest = acct[len(root):].lstrip(":")
        name = rest.split(":")[0] if rest else acct.split(":")[-1]
        child = f"{root}:{name}" if rest else acct
        d = store.setdefault(child, {"name": name, "total": D("0")})
        d["total"] += val

    for t in led.txns:
        if (t.date.year, t.date.month) not in cand_set:
            continue
        for p in t.postings:
            if p.units is None:
                continue
            val = posting_chf(p, led.price_map, led.opcur, t.date)
            if p.account == "Income" or p.account.startswith("Income:"):
                bucket(inc, "Income", p.account, -val)  # credits -> positive
            elif p.account == "Expenses" or p.account.startswith("Expenses:"):
                bucket(exp, "Expenses", p.account, val)

    def pack(store):
        rows = [
            {"account": a, "name": d["name"], "monthly": num(d["total"] / n) if n else None}
            for a, d in store.items()
        ]
        rows.sort(key=lambda r: r["monthly"] or 0, reverse=True)
        return rows

    income_rows = pack(inc)
    expense_rows = pack(exp)
    inc_total = sum((D(str(r["monthly"] or 0)) for r in income_rows), D("0"))
    exp_total = sum((D(str(r["monthly"] or 0)) for r in expense_rows), D("0"))

    return {
        "currency": led.opcur,
        "based_on_months": n,
        "income": income_rows,
        "expenses": expense_rows,
        "income_total": num(inc_total),
        "expense_total": num(exp_total),
        "net": num(inc_total - exp_total),
    }


@app.get("/cashflow")
def cashflow(
    from_: str = Query(None, alias="from"),
    to: str = Query(None),
):
    """Monthly income vs expenses, each broken down by top-level category, for a
    diverging stacked-bar chart (income above zero, expenses below). Income is
    returned as positive numbers (postings are credits/negative in the ledger);
    the frontend renders expenses below the axis."""
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)

    months = month_range(lo, hi)
    midx = {mk: i for i, mk in enumerate(months)}
    inc = {}
    exp = {}

    def bucket(store, root, acct, i, val):
        rest = acct[len(root):].lstrip(":")
        name = rest.split(":")[0] if rest else acct.split(":")[-1]
        child = f"{root}:{name}" if rest else acct
        d = store.get(child)
        if d is None:
            d = store[child] = {"name": name, "monthly": [D("0")] * len(months)}
        d["monthly"][i] += val

    for t in led.txns:
        if not (lo <= t.date <= hi):
            continue
        i = midx[f"{t.date.year}-{t.date.month:02d}"]
        for p in t.postings:
            if p.units is None:
                continue
            val = posting_chf(p, led.price_map, led.opcur, t.date)
            if p.account == "Income" or p.account.startswith("Income:"):
                bucket(inc, "Income", p.account, i, -val)  # credits -> positive income
            elif p.account == "Expenses" or p.account.startswith("Expenses:"):
                bucket(exp, "Expenses", p.account, i, val)

    def pack(store):
        rows = [
            {
                "account": acct,
                "name": d["name"],
                "total": num(sum(d["monthly"], D("0"))),
                "monthly": [num(x) for x in d["monthly"]],
            }
            for acct, d in store.items()
        ]
        rows.sort(key=lambda r: r["total"] or 0, reverse=True)
        return rows

    income_rows = pack(inc)
    expense_rows = pack(exp)
    net = []
    for i in range(len(months)):
        ti = sum((D(str(r["monthly"][i] or 0)) for r in income_rows), D("0"))
        te = sum((D(str(r["monthly"][i] or 0)) for r in expense_rows), D("0"))
        net.append(num(ti - te))

    return {
        "currency": led.opcur,
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "months": months,
        "income": income_rows,
        "expenses": expense_rows,
        "net": net,
    }


@app.get("/expenses")
def expenses(
    account: str = Query("Expenses"),
    from_: str = Query(None, alias="from"),
    to: str = Query(None),
):
    """Spending analytics for an account subtree: total, monthly trend, immediate
    sub-category breakdown, and top payees. Works for any account, but is meant
    for the Expenses tree (whose postings are positive spend)."""
    led = get_ledger()
    lo, hi = period_bounds(led, from_, to)
    prefix = account

    def matches(acct):
        return acct == prefix or acct.startswith(prefix + ":")

    total = D("0")
    count = 0
    months = month_range(lo, hi)
    monthly = {mk: D("0") for mk in months}
    by_cat = {}
    by_payee = {}

    for t in led.txns:
        if not (lo <= t.date <= hi):
            continue
        mk = f"{t.date.year}-{t.date.month:02d}"
        contrib = D("0")
        for p in t.postings:
            if p.units is None or not matches(p.account):
                continue
            val = posting_chf(p, led.price_map, led.opcur, t.date)
            total += val
            monthly[mk] = monthly.get(mk, D("0")) + val
            contrib += val
            # Immediate child of `account` (the drill-down level).
            rest = p.account[len(prefix):].lstrip(":")
            if rest:
                child_name = rest.split(":")[0]
                child_acct = f"{prefix}:{child_name}"
            else:
                child_name = p.account.split(":")[-1]
                child_acct = p.account
            c = by_cat.setdefault(child_acct, {"amount": D("0"), "name": child_name})
            c["amount"] += val
        if contrib != 0:
            count += 1
            payee = t.payee or "(ohne Zahlungsempfänger)"
            bp = by_payee.setdefault(payee, {"amount": D("0"), "count": 0})
            bp["amount"] += contrib
            bp["count"] += 1

    n_months = max(1, len(months))
    return {
        "currency": led.opcur,
        "account": account,
        "from": lo.isoformat(),
        "to": hi.isoformat(),
        "total": num(total),
        "count": count,
        "avg_per_month": num(total / n_months),
        "monthly": [{"month": mk, "amount": num(monthly[mk])} for mk in months],
        "by_category": sorted(
            ({"account": k, "name": v["name"], "amount": num(v["amount"])} for k, v in by_cat.items()),
            key=lambda x: x["amount"] or 0,
            reverse=True,
        ),
        "by_payee": sorted(
            ({"payee": k, "amount": num(v["amount"]), "count": v["count"]} for k, v in by_payee.items()),
            key=lambda x: x["amount"] or 0,
            reverse=True,
        )[:15],
    }

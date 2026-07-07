# finance-service

Read-only JSON API over the [beancount](https://beancount.github.io) ledger,
consumed by the website's `/finances` dashboards. It replicates Fava's core
reports (net worth, balance sheet, income statement, holdings, journal) as JSON
so the SvelteKit app can render custom, themed dashboards.

It **never writes** to the ledger — all imports and edits stay in the ledger
repo's `make` workflow. Bind it to localhost; the SvelteKit server proxies to it
via `/api/finances/*` (which enforces auth). It is not meant to be exposed
publicly.

## How it works

`app.py` loads `LEDGER_PATH` once and caches `(entries, options, price_map)`. A
request reloads the ledger only when one of the included `.bean` files changes on
disk (an mtime check). A full load is ~200 ms; per-request queries are
milliseconds.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /health` | liveness + entry/error counts |
| `GET /meta` | accounts, commodities (name/asset-class/isin), date range, counts |
| `GET /networth?from&to&step` | net-worth time series (CHF, market) + snapshot |
| `GET /balance-sheet?date` | Assets/Liabilities/Equity tree, valued at market |
| `GET /income-statement?from&to` | Income/Expenses tree for the period |
| `GET /holdings?date` | per-commodity units, cost, market, unrealized gain |
| `GET /journal?account&from&to&limit&offset` | paginated transactions |

All money is CHF (the operating currency), converted at market prices for the
requested date, unless a `units`/`currency` field says otherwise. Dates are
`YYYY-MM-DD`.

> **Price coverage.** Daily prices currently start ~2025-10-01, so market values
> before then fall back to cost and the net-worth curve is flat/understated in
> that early window. Run `make prices` in the ledger repo to backfill further.

## Run locally (dev)

```sh
python -m venv --system-site-packages venv    # inherits Arch's beancount
./venv/bin/pip install -r requirements.txt
LEDGER_PATH=/home/alex/.local/src/accounting/main.bean \
  ./venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8091
curl -s localhost:8091/health
```

The website reads `FINANCE_SERVICE_URL` (default `http://127.0.0.1:8091/`) from
its `.env`.

## Tests

```sh
./venv/bin/pip install pytest httpx
# PYTEST_DISABLE_PLUGIN_AUTOLOAD avoids a broken system pytest plugin that the
# --system-site-packages venv would otherwise pick up.
LEDGER_PATH=/home/alex/.local/src/accounting/main.bean \
  PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 ./venv/bin/python -m pytest   # totals vs ledger
```

## Install on the server

Mirrors `ocr-service`. The unit expects the service at
`/usr/share/webapps/homepage/finance-service` (next to the deployed site), the
venv created **there**, and the **ledger deployed on the host** (the accounting
repo is a separate git repo; refresh it with `make build && make prices`).

```sh
sudo install -d /usr/share/webapps/homepage/finance-service
sudo cp app.py requirements.txt /usr/share/webapps/homepage/finance-service/
cd /usr/share/webapps/homepage/finance-service
python3 -m venv --system-site-packages venv
./venv/bin/pip install -r requirements.txt

# Deploy the ledger somewhere the (DynamicUser, ProtectHome=yes) service can
# read — NOT under /home. E.g. a checkout at ./ledger:
#   git clone <accounting-repo> ledger && (cd ledger && make build && make prices)
# LEDGER_PATH in the unit points at ledger/main.bean.

sudo cp finance-service.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now finance-service
curl -s localhost:8091/health
```

Then set `FINANCE_SERVICE_URL=http://127.0.0.1:8091/` in the website's `.env`.

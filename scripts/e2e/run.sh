#!/usr/bin/env bash
# One-command e2e: bring up the isolated stack, provision Authentik, clone
# realistic dev content + overlay fixtures, then run Playwright. Args are passed
# through to `playwright test` (e.g. --ui, --project=chromium, a spec path).
#
#   bash scripts/e2e/run.sh                 # full suite
#   bash scripts/e2e/run.sh recipes/        # one folder
#   KEEP_UP=1 bash scripts/e2e/run.sh       # leave the stack running afterwards
set -euo pipefail
cd "$(dirname "$0")/../.."

COMPOSE="docker compose -f docker-compose.test.yml"

# Load fixed test env (also gives the scripts their source/dest DB URLs).
set -a; # shellcheck disable=SC1091
source .env.test; set +a

cleanup() {
	if [[ "${KEEP_UP:-0}" != "1" ]]; then
		echo "🧹 Tearing down test stack (KEEP_UP=1 to keep it)…"
		$COMPOSE down -v
	fi
}
trap cleanup EXIT

echo "🐳 Starting Mongo + Authentik…"
$COMPOSE up -d --wait

echo "🔐 Provisioning Authentik…"
node scripts/e2e/provision-authentik.mjs

echo "📋 Cloning dev content (graceful skip if dev DB is absent)…"
node scripts/e2e/clone-dev.mjs

echo "🌱 Applying deterministic overlay…"
node scripts/e2e/seed.mjs

echo "🎭 Running Playwright…"
pnpm exec playwright test "$@"

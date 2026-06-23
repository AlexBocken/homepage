#!/usr/bin/env bash
# Build locally and rsync artifacts to the production server.
# Avoids running pnpm / npm / any git-hosted prepare step on the server.
#
# Assumes:
#   - Local machine matches the server's arch + libc (linux-x64-glibc).
#   - Local Node major version matches the server's.
#   - Root SSH to $REMOTE works (key-based).
#
# Usage: scripts/deploy.sh [--dry-run]

set -euo pipefail

REMOTE="${REMOTE:-root@bocken.org}"
REMOTE_DIR="${REMOTE_DIR:-/usr/share/webapps/homepage}"
REMOTE_USER_GROUP="${REMOTE_USER_GROUP:-homepage:homepage}"
SERVICE="${SERVICE:-homepage.service}"
ERROR_PAGES_DIR="${ERROR_PAGES_DIR:-/var/www/errors}"
ERROR_PAGES_OWNER="${ERROR_PAGES_OWNER:-http:http}"
# Hike images live outside the Node app: nginx serves /hikes/<slug>/images/
# directly from disk and gates /hikes/<slug>/private/ through Node via
# X-Accel-Redirect. The build pipeline writes them to ./hikes-assets/ and we
# rsync that tree to the path nginx serves from.
HIKES_ASSETS_DIR="${HIKES_ASSETS_DIR:-/var/www/static/hikes}"
HIKES_ASSETS_OWNER="${HIKES_ASSETS_OWNER:-http:http}"
# Private (auth-gated) images for <Image private>. Built into ./private-assets/
# and served by nginx ONLY via an `internal` location reached through the
# endpoint's X-Accel-Redirect — add this once to the server's nginx config:
#   location /protected-images/ { internal; alias /var/www/static/private-images/; }
PRIVATE_ASSETS_DIR="${PRIVATE_ASSETS_DIR:-/var/www/static/private-images}"
PRIVATE_ASSETS_OWNER="${PRIVATE_ASSETS_OWNER:-http:http}"
# Sticker SVGs (cats + baked dashed outlines) are served by nginx at
# bocken.org/static/stickers/ instead of through Node, so the rewards album can
# load ~200 of them lazily and cached. They live in ./static/stickers/ and we
# rsync that tree to the path nginx serves.
STICKERS_ASSETS_DIR="${STICKERS_ASSETS_DIR:-/var/www/static/stickers}"
STICKERS_ASSETS_OWNER="${STICKERS_ASSETS_OWNER:-http:http}"

DRY=""
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY="--dry-run"
    echo ":: DRY RUN — no files will be transferred"
fi

cd "$(dirname "$0")/.."

echo ":: Sanity-checking local/remote toolchain parity"
local_node=$(node --version)
remote_node=$(ssh "$REMOTE" 'node --version')
if [[ "${local_node%%.*}" != "${remote_node%%.*}" ]]; then
    echo "!! Node major mismatch: local $local_node vs remote $remote_node"
    echo "   Native modules (sharp, onnxruntime, bson) may break. Aborting."
    exit 1
fi
echo "   node $local_node (match)"

echo ":: Installing deps (frozen lockfile)"
pnpm install --frozen-lockfile

# Build against production env, NOT the dev .env. SvelteKit's
# `$env/static/private` (IMAGE_DIR, DB creds, …) is inlined at BUILD time, so a
# build that picks up the dev .env ships dev values to prod — e.g. the relative
# IMAGE_DIR="./imgs/" that resolves under the service's dist/ cwd instead of the
# real served image dir. We export .env_prod into the environment; real env vars
# take precedence over .env files in Vite/SvelteKit's env loading, so this wins
# for the whole `pnpm build` lifecycle (prebuild vite-node scripts + build).
PROD_ENV="${PROD_ENV:-.env_prod}"
if [[ ! -f "$PROD_ENV" ]]; then
    echo "!! $PROD_ENV not found in $(pwd) — refusing to build with the dev .env."
    echo "   Create $PROD_ENV with production values (IMAGE_DIR must be an"
    echo "   ABSOLUTE path to the served recipe-image dir, DB creds, etc.)."
    exit 1
fi
echo ":: Building (env from $PROD_ENV)"
set -a
# shellcheck source=/dev/null
source "$PROD_ENV"
set +a
pnpm build

if [[ ! -d build ]]; then
    echo "!! build/ not produced — aborting"
    exit 1
fi

# The server's systemd unit runs from $REMOTE_DIR/dist, so map build → dist.
echo ":: Syncing build/ → $REMOTE:$REMOTE_DIR/dist/"
rsync -az --delete $DRY --info=progress2 \
    build/ "$REMOTE:$REMOTE_DIR/dist/"

echo ":: Syncing node_modules/ → $REMOTE:$REMOTE_DIR/node_modules/"
rsync -az --delete $DRY --info=progress2 \
    node_modules/ "$REMOTE:$REMOTE_DIR/node_modules/"

echo ":: Syncing static/ → $REMOTE:$REMOTE_DIR/static/"
rsync -az --delete $DRY --info=progress2 \
    static/ "$REMOTE:$REMOTE_DIR/static/"

echo ":: Syncing static/stickers/ → $REMOTE:$STICKERS_ASSETS_DIR/ (nginx-served)"
ssh "$REMOTE" "mkdir -p $STICKERS_ASSETS_DIR"
rsync -az --delete $DRY --info=progress2 \
    static/stickers/ "$REMOTE:$STICKERS_ASSETS_DIR/"

echo ":: Syncing package.json + pnpm-lock.yaml"
rsync -az $DRY \
    package.json pnpm-lock.yaml "$REMOTE:$REMOTE_DIR/"

if [[ ! -d build/client/errors ]]; then
    echo "!! build/client/errors not produced — postbuild error-page step did not run"
    exit 1
fi

echo ":: Syncing error pages → $REMOTE:$ERROR_PAGES_DIR/"
ssh "$REMOTE" "mkdir -p $ERROR_PAGES_DIR"
rsync -az --delete $DRY --info=progress2 \
    build/client/errors/ "$REMOTE:$ERROR_PAGES_DIR/"

if [[ -d hikes-assets ]]; then
    echo ":: Syncing hikes-assets/ → $REMOTE:$HIKES_ASSETS_DIR/"
    ssh "$REMOTE" "mkdir -p $HIKES_ASSETS_DIR"
    rsync -az --delete $DRY --info=progress2 \
        hikes-assets/ "$REMOTE:$HIKES_ASSETS_DIR/"
else
    echo ":: No hikes-assets/ dir — skipping nginx-served hike images sync"
fi

if [[ -d private-assets ]]; then
    echo ":: Syncing private-assets/ → $REMOTE:$PRIVATE_ASSETS_DIR/"
    ssh "$REMOTE" "mkdir -p $PRIVATE_ASSETS_DIR"
    rsync -az --delete $DRY --info=progress2 \
        private-assets/ "$REMOTE:$PRIVATE_ASSETS_DIR/"
else
    echo ":: No private-assets/ dir — skipping auth-gated image sync"
fi

if [[ -n "$DRY" ]]; then
    echo ":: Dry run complete — no service restart"
    exit 0
fi

echo ":: Fixing ownership on server"
ssh "$REMOTE" "chown -R $REMOTE_USER_GROUP $REMOTE_DIR/dist $REMOTE_DIR/node_modules $REMOTE_DIR/static $REMOTE_DIR/package.json $REMOTE_DIR/pnpm-lock.yaml && chown -R $ERROR_PAGES_OWNER $ERROR_PAGES_DIR && if [[ -d $HIKES_ASSETS_DIR ]]; then chown -R $HIKES_ASSETS_OWNER $HIKES_ASSETS_DIR; fi && if [[ -d $PRIVATE_ASSETS_DIR ]]; then chown -R $PRIVATE_ASSETS_OWNER $PRIVATE_ASSETS_DIR; fi && if [[ -d $STICKERS_ASSETS_DIR ]]; then chown -R $STICKERS_ASSETS_OWNER $STICKERS_ASSETS_DIR; fi"

echo ":: Restarting $SERVICE"
ssh "$REMOTE" "systemctl restart $SERVICE"

echo ":: Verifying service is active"
sleep 2
if ssh "$REMOTE" "systemctl is-active --quiet $SERVICE"; then
    echo "   $SERVICE is running"
else
    echo "!! $SERVICE failed to start — check logs:"
    ssh "$REMOTE" "journalctl -u $SERVICE -n 30 --no-pager"
    exit 1
fi

echo ":: Deploy complete"

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

echo ":: Building"
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

echo ":: Syncing package.json + pnpm-lock.yaml"
rsync -az $DRY \
    package.json pnpm-lock.yaml "$REMOTE:$REMOTE_DIR/"

if [[ -n "$DRY" ]]; then
    echo ":: Dry run complete — no service restart"
    exit 0
fi

echo ":: Fixing ownership on server"
ssh "$REMOTE" "chown -R $REMOTE_USER_GROUP $REMOTE_DIR/dist $REMOTE_DIR/node_modules $REMOTE_DIR/static $REMOTE_DIR/package.json $REMOTE_DIR/pnpm-lock.yaml"

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

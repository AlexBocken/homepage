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
#   SKIP_ALT_CHECK=1 skips the (advisory) hike alt-text check.

set -euo pipefail

REMOTE="${REMOTE:-root@bocken.org}"
REMOTE_DIR="${REMOTE_DIR:-/usr/share/webapps/homepage}"
# homepage.service runs as http:http. The server build has the private env
# (DB URL, Authentik secret, DeepL key, …) compiled in, so the app tree is
# owner homepage, group http (read-only), and nothing for other users.
REMOTE_USER_GROUP="${REMOTE_USER_GROUP:-homepage:http}"
SERVICE="${SERVICE:-homepage.service}"
ERROR_PAGES_DIR="${ERROR_PAGES_DIR:-/var/www/errors}"
ERROR_PAGES_OWNER="${ERROR_PAGES_OWNER:-http:http}"
# Hike images live outside the Node app: nginx serves /hikes/<slug>/images/
# directly from disk and gates /hikes/<slug>/private/ through Node via
# X-Accel-Redirect. The build pipeline writes them to ./hikes-assets/ and we
# rsync that tree to the path nginx serves from.
HIKES_ASSETS_DIR="${HIKES_ASSETS_DIR:-/var/www/static/hikes}"
HIKES_ASSETS_OWNER="${HIKES_ASSETS_OWNER:-http:http}"
# Sticker SVGs (cats + baked dashed outlines) are served by nginx at
# bocken.org/static/stickers/ instead of through Node, so the rewards album can
# load ~200 of them lazily and cached. They live in ./static/stickers/ and we
# rsync that tree to the path nginx serves.
STICKERS_ASSETS_DIR="${STICKERS_ASSETS_DIR:-/var/www/static/stickers}"
STICKERS_ASSETS_OWNER="${STICKERS_ASSETS_OWNER:-http:http}"
# Android APK: built + signed by scripts/android-build-deploy.sh and published to
# the nginx-served path below, but ONLY when the Tauri app version was bumped.
# "Bumped" = src-tauri/tauri.conf.json version differs from the sidecar
# Bocken.apk.version recorded on the server next to the last-published APK.
APK_REMOTE_PATH="${APK_REMOTE_PATH:-/var/www/static/Bocken.apk}"
APK_OWNER="${APK_OWNER:-http:http}"
APK_SIGNED="src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-signed.apk"
TAURI_CONF="src-tauri/tauri.conf.json"
# Map tile proxy (tile-proxy/): built here and installed as a root-owned,
# execute-only binary. Its Thunderforest key is baked in at build time from
# tile-proxy/.env (see tile-proxy/build.rs), so nothing secret goes to the
# server as a file — only the binary, and that is unreadable to other users.
# SKIP_TILE_PROXY=1 leaves the installed proxy alone.
TILE_PROXY_DIR="${TILE_PROXY_DIR:-/opt/tile-proxy}"
TILE_PROXY_SERVICE="${TILE_PROXY_SERVICE:-tile-proxy.service}"

# Never ship these, whatever directory they turn up in: dotfiles (.claude/
# agent settings, .env, .git, editor state) and source maps (the server never
# loads them — node runs without --enable-source-maps — and they carry the
# full source). /.well-known/ is the one dot-path a site legitimately serves.
# --delete-excluded also removes them from the server where an older deploy
# already put them. Not used for node_modules/, whose .pnpm/ and .bin/ are
# load-bearing.
RSYNC_EXCLUDES=(
    --include='/.well-known/***'
    --exclude='.*'
    --exclude='*.map'
    --delete-excluded
)
# Applied to everything under $REMOTE_DIR that the service reads. rsync -a
# would otherwise copy the laptop's 644/755 modes over and make it all
# world-readable again on every deploy.
RSYNC_APP_PERMS=(
    --chown="$REMOTE_USER_GROUP"
    --chmod=Dg-w,o-rwx,Fg-w,o-rwx
)

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

# Signed early so the gpg passphrase prompt comes now, not after the build.
# Before the build too, so the copy SvelteKit bakes into build/client is the
# fresh one. Renews "Expires" on every deploy.
echo ":: Signing security.txt"
bash scripts/sign-security-txt.sh

echo ":: Installing deps (frozen lockfile)"
pnpm install --frozen-lockfile

# Hike photo alt text is NOT part of the build: it comes from a local vision
# model (ollama) via `pnpm run hikes:alt`, which writes
# src/content/hikes/<slug>/alt-text.json. build-hikes.ts builds happily without
# it and falls back to "Bild 2", "Bild 3", … — usable, but not for anyone on a
# screen reader. Advisory only: generating the texts needs the model running,
# which a deploy shouldn't depend on, so this reports and carries on. The check
# only hashes files; it never contacts the model itself.
if [[ -z "${SKIP_ALT_CHECK:-}" ]]; then
    echo ":: Checking hike alt text"
    if ! pnpm exec vite-node scripts/generate-hike-alt-text.ts -- --check; then
        # The check already printed the slugs and the exact command to run.
        echo "   Those photos ship with a generic \"Bild N\" description instead."
        echo "   Generating them needs ollama running — stop here if you want that."
        echo "   Continuing with the deploy."
    fi
fi

# English hike prose comes from DeepL via `pnpm run hikes:translate`, which
# writes src/content/hikes/<slug>/index.en.svx + translation.en.json (both
# committed). Advisory like the alt-text check: a hike without a translation
# shows its German prose under /hikes with a notice, and a stale one shows the
# previous translation — neither is worth stopping a deploy for. The check only
# hashes files; it never contacts DeepL.
if [[ -z "${SKIP_TRANSLATE_CHECK:-}" ]]; then
    echo ":: Checking hike translations"
    if ! pnpm exec vite-node scripts/translate-hikes.ts -- --check; then
        echo "   Stale or unabsorbed translations ship as they are."
        echo "   Continuing with the deploy."
    fi
fi

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
# The Church Fathers' commentary lives in MongoDB, not in the build. After a
# change to ../commentaries or scripts/import-commentary.ts, run the import
# against production once before deploying (idempotent; dry run without --apply):
#   MONGO_URL='mongodb://…' pnpm commentary:import --apply
pnpm build

if [[ ! -d build ]]; then
    echo "!! build/ not produced — aborting"
    exit 1
fi

# The server's systemd unit runs from $REMOTE_DIR/dist, so map build → dist.
echo ":: Syncing build/ → $REMOTE:$REMOTE_DIR/dist/"
rsync -az --delete $DRY --info=progress2 "${RSYNC_APP_PERMS[@]}" "${RSYNC_EXCLUDES[@]}" \
    build/ "$REMOTE:$REMOTE_DIR/dist/"

# The server only needs production deps at runtime, so prune the build-only
# devDependencies before shipping node_modules. Build already ran above (it needs
# the dev deps), and they're restored right after the sync — both so local dev
# isn't left crippled and because the optional APK build below needs @tauri-apps/cli.
# Skipped entirely on --dry-run so the tree is never mutated.
if [[ -z "$DRY" ]]; then
    echo ":: Pruning dev dependencies from node_modules (production-only)"
    pnpm prune --prod
    # Safety net: restore dev deps on any exit, even if a later step aborts.
    trap 'echo ":: Restoring dev dependencies locally"; pnpm install --frozen-lockfile' EXIT
fi

echo ":: Syncing node_modules/ → $REMOTE:$REMOTE_DIR/node_modules/"
rsync -az --delete $DRY --info=progress2 "${RSYNC_APP_PERMS[@]}" \
    node_modules/ "$REMOTE:$REMOTE_DIR/node_modules/"

if [[ -z "$DRY" ]]; then
    echo ":: Restoring dev dependencies locally"
    pnpm install --frozen-lockfile
    trap - EXIT
fi

echo ":: Syncing static/ → $REMOTE:$REMOTE_DIR/static/"
rsync -az --delete $DRY --info=progress2 "${RSYNC_APP_PERMS[@]}" "${RSYNC_EXCLUDES[@]}" \
    static/ "$REMOTE:$REMOTE_DIR/static/"

echo ":: Syncing static/stickers/ → $REMOTE:$STICKERS_ASSETS_DIR/ (nginx-served)"
ssh "$REMOTE" "mkdir -p $STICKERS_ASSETS_DIR"
rsync -az --delete $DRY --info=progress2 "${RSYNC_EXCLUDES[@]}" \
    static/stickers/ "$REMOTE:$STICKERS_ASSETS_DIR/"

echo ":: Syncing package.json + pnpm-lock.yaml"
rsync -az $DRY "${RSYNC_APP_PERMS[@]}" \
    package.json pnpm-lock.yaml "$REMOTE:$REMOTE_DIR/"

if [[ ! -d build/client/errors ]]; then
    echo "!! build/client/errors not produced — postbuild error-page step did not run"
    exit 1
fi

echo ":: Syncing error pages → $REMOTE:$ERROR_PAGES_DIR/"
ssh "$REMOTE" "mkdir -p $ERROR_PAGES_DIR"
rsync -az --delete $DRY --info=progress2 "${RSYNC_EXCLUDES[@]}" \
    build/client/errors/ "$REMOTE:$ERROR_PAGES_DIR/"

if [[ -d hikes-assets ]]; then
    echo ":: Syncing hikes-assets/ → $REMOTE:$HIKES_ASSETS_DIR/"
    ssh "$REMOTE" "mkdir -p $HIKES_ASSETS_DIR"
    rsync -az --delete $DRY --info=progress2 "${RSYNC_EXCLUDES[@]}" \
        hikes-assets/ "$REMOTE:$HIKES_ASSETS_DIR/"
else
    echo ":: No hikes-assets/ dir — skipping nginx-served hike images sync"
fi

if [[ -n "${SKIP_TILE_PROXY:-}" ]]; then
    echo ":: SKIP_TILE_PROXY set — leaving the tile proxy alone"
else
    # Without a key the build silently falls back to OpenTopoMap, which would
    # replace the Thunderforest binary on the server. Refuse instead.
    if [[ ! -f tile-proxy/.env && -z "${THUNDERFOREST_API_KEY:-}" ]]; then
        echo "!! tile-proxy/.env missing — the proxy would build without its Thunderforest key."
        echo "   Restore it, or rerun with SKIP_TILE_PROXY=1."
        exit 1
    fi
    echo ":: Building tile-proxy (key baked in from tile-proxy/.env)"
    (cd tile-proxy && cargo build --release --locked)
    tp_bin=tile-proxy/target/release/tile-proxy
    tp_local_sum=$(sha256sum "$tp_bin" | cut -d' ' -f1)
    tp_remote_sum=$(ssh "$REMOTE" "sha256sum '$TILE_PROXY_DIR/tile-proxy' 2>/dev/null | cut -d' ' -f1" || true)
    tp_unit_changed=$(rsync -ci --dry-run tile-proxy/deploy/tile-proxy.service \
        "$REMOTE:/etc/systemd/system/$TILE_PROXY_SERVICE")
    if [[ "$tp_local_sum" == "$tp_remote_sum" && -z "$tp_unit_changed" ]]; then
        echo ":: tile-proxy unchanged — skipping install"
    elif [[ -n "$DRY" ]]; then
        echo ":: [dry-run] would install tile-proxy → $REMOTE:$TILE_PROXY_DIR/ and restart $TILE_PROXY_SERVICE"
    else
        echo ":: Installing tile-proxy → $REMOTE:$TILE_PROXY_DIR/ (root:root 0711)"
        # Upload to a 0700 staging name, then fix mode and rename into place, so
        # the key-bearing binary is never readable by anyone but root — not
        # even for the moment between the copy and the chmod.
        ssh "$REMOTE" "install -d -o root -g root -m 0755 '$TILE_PROXY_DIR'"
        rsync -a --chmod=F0700 "$tp_bin" "$REMOTE:$TILE_PROXY_DIR/.tile-proxy.new"
        rsync -a --chmod=F0644 tile-proxy/deploy/tile-proxy.service \
            "$REMOTE:/etc/systemd/system/$TILE_PROXY_SERVICE"
        ssh "$REMOTE" "chown root:root '$TILE_PROXY_DIR/.tile-proxy.new' /etc/systemd/system/$TILE_PROXY_SERVICE \
            && chmod 0711 '$TILE_PROXY_DIR/.tile-proxy.new' \
            && mv '$TILE_PROXY_DIR/.tile-proxy.new' '$TILE_PROXY_DIR/tile-proxy' \
            && systemctl daemon-reload && systemctl restart $TILE_PROXY_SERVICE"
        sleep 1
        if ssh "$REMOTE" "systemctl is-active --quiet $TILE_PROXY_SERVICE"; then
            echo "   $TILE_PROXY_SERVICE is running"
        else
            echo "!! $TILE_PROXY_SERVICE failed to start — check logs:"
            ssh "$REMOTE" "journalctl -u $TILE_PROXY_SERVICE -n 30 --no-pager"
            exit 1
        fi
    fi
fi

if [[ -n "$DRY" ]]; then
    echo ":: Dry run — skipping ownership fix + service restart"
else
    echo ":: Fixing ownership on server"
    app_paths="$REMOTE_DIR/dist $REMOTE_DIR/node_modules $REMOTE_DIR/static $REMOTE_DIR/package.json $REMOTE_DIR/pnpm-lock.yaml"
    ssh "$REMOTE" "chown -R $REMOTE_USER_GROUP $app_paths && chmod -R g-w,o-rwx $app_paths && chown -R $ERROR_PAGES_OWNER $ERROR_PAGES_DIR && if [[ -d $HIKES_ASSETS_DIR ]]; then chown -R $HIKES_ASSETS_OWNER $HIKES_ASSETS_DIR; fi && if [[ -d $STICKERS_ASSETS_DIR ]]; then chown -R $STICKERS_ASSETS_OWNER $STICKERS_ASSETS_DIR; fi"

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
fi

# Publish the Android APK only when the Tauri app version was bumped (see config above).
# A web-only deploy leaves tauri.conf.json untouched, so this whole block no-ops.
local_tauri_version=$(grep -m1 '"version"' "$TAURI_CONF" | sed -E 's/.*:[[:space:]]*"([^"]+)".*/\1/' || true)
remote_tauri_version=$(ssh "$REMOTE" "cat '${APK_REMOTE_PATH}.version' 2>/dev/null" || true)

if [[ -z "$local_tauri_version" ]]; then
    echo "!! Could not read Tauri version from $TAURI_CONF — skipping APK publish"
elif [[ "$local_tauri_version" == "$remote_tauri_version" ]]; then
    echo ":: Tauri app v$local_tauri_version unchanged — skipping APK build/publish"
elif [[ -n "$DRY" ]]; then
    echo ":: [dry-run] Tauri app bumped (${remote_tauri_version:-none} → $local_tauri_version) — would build + publish APK to $REMOTE:$APK_REMOTE_PATH"
else
    echo ":: Tauri app bumped (${remote_tauri_version:-none} → $local_tauri_version) — building signed APK"
    bash scripts/android-build-deploy.sh build
    if [[ ! -f "$APK_SIGNED" ]]; then
        echo "!! Signed APK not found at $APK_SIGNED — aborting APK publish"
        exit 1
    fi
    echo ":: Syncing APK → $REMOTE:$APK_REMOTE_PATH"
    rsync -az --info=progress2 "$APK_SIGNED" "$REMOTE:$APK_REMOTE_PATH"
    ssh "$REMOTE" "printf '%s' '$local_tauri_version' > '${APK_REMOTE_PATH}.version' && chown $APK_OWNER '$APK_REMOTE_PATH' '${APK_REMOTE_PATH}.version'"
    echo ":: Published Bocken.apk v$local_tauri_version"
fi

echo ":: Deploy complete"

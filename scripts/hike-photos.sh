#!/usr/bin/env bash
# Sync hike *source* photos to/from a backup server, keeping them out of git.
#
# The repo tracks each hike's index.svx + track.gpx — the manifest of which
# images a hike uses (by content hash) and where they sit on the route. The
# original JPEGs are large and live here instead of in git. `push` backs the
# local photos up; `pull` restores them so any machine can run build-hikes and
# reproduce the encoded static assets.
#
# Only photo files are transferred — images/, private/ and root cover.* —
# mirroring the .gitignore rules; the text files stay in git and are skipped.
#
# Usage:
#   scripts/hike-photos.sh push [--dry-run] [--delete]
#   scripts/hike-photos.sh pull [--dry-run] [--delete]
#
#   --dry-run  show what would transfer, change nothing
#   --delete   mirror exactly (remove extra files on the destination) — careful
#
# Config (env vars, with defaults):
#   REMOTE           SSH host                  (default root@bocken.org)
#   HIKE_PHOTOS_DIR  remote dir for originals  (default /var/backups/hike-photos)

set -euo pipefail

REMOTE="${REMOTE:-root@bocken.org}"
HIKE_PHOTOS_DIR="${HIKE_PHOTOS_DIR:-/var/backups/hike-photos}"

cd "$(dirname "$0")/.."
LOCAL="src/content/hikes/"
REMOTE_PATH="$REMOTE:$HIKE_PHOTOS_DIR/"

cmd="${1:-}"
shift || true

EXTRA=()
for arg in "$@"; do
	case "$arg" in
		--dry-run) EXTRA+=(--dry-run); echo ":: DRY RUN — nothing will be transferred" ;;
		--delete) EXTRA+=(--delete) ;;
		*) echo "!! Unknown option: $arg" >&2; exit 1 ;;
	esac
done

# Transfer only the photo files: descend into each hike dir, take images/,
# private/ and a root cover.*, drop everything else (index.svx, track.gpx,
# icon.svg — those are versioned in git). Empty dirs (e.g. text-only TODO
# drafts) are pruned so the backup stays clean.
FILTERS=(
	--prune-empty-dirs
	--include='/*/'
	--include='/*/images/'
	--include='/*/images/**'
	--include='/*/private/'
	--include='/*/private/**'
	--include='/*/cover.*'
	--exclude='*'
)

case "$cmd" in
	push)
		echo ":: Pushing hike photos → $REMOTE_PATH"
		ssh "$REMOTE" "mkdir -p '$HIKE_PHOTOS_DIR'"
		rsync -avh --info=progress2 "${EXTRA[@]}" "${FILTERS[@]}" "$LOCAL" "$REMOTE_PATH"
		;;
	pull)
		echo ":: Pulling hike photos ← $REMOTE_PATH"
		mkdir -p "$LOCAL"
		rsync -avh --info=progress2 "${EXTRA[@]}" "${FILTERS[@]}" "$REMOTE_PATH" "$LOCAL"
		;;
	*)
		echo "Usage: $0 {push|pull} [--dry-run] [--delete]" >&2
		exit 1
		;;
esac

echo ":: done"

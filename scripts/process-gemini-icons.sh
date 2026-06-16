#!/usr/bin/env bash
# Process raw Gemini-generated shopping icons:
# 1. Crop out the bottom-right watermark (sparkle)
# 2. Remove solid black background → transparent
# 3. Trim whitespace/transparent padding
#
# Usage: ./scripts/process-gemini-icons.sh [file...]
#   No args: processes all unprocessed gemini_raw-*.png in static/shopping-icons/
#   With args: processes only the specified raw files

set -euo pipefail

ICON_DIR="static/shopping-icons"

# Collect files to process
if [ $# -gt 0 ]; then
  files=("$@")
else
  files=()
  for raw in "$ICON_DIR"/gemini_raw-*.png; do
    [ -f "$raw" ] || continue
    name=$(basename "$raw" | sed 's/gemini_raw-//')
    if [ ! -f "$ICON_DIR/$name" ]; then
      files+=("$raw")
    fi
  done
fi

if [ ${#files[@]} -eq 0 ]; then
  echo "No unprocessed icons found."
  exit 0
fi

echo "Processing ${#files[@]} icon(s)..."

for raw in "${files[@]}"; do
  name=$(basename "$raw" | sed 's/gemini_raw-//')
  out="$ICON_DIR/$name"

  echo "  $name"

  # Get image dimensions
  dims=$(identify -format '%wx%h' "$raw")
  w=${dims%x*}
  h=${dims#*x}

  # 1. Remove the Gemini watermark sparkle from the bottom-right corner.
  #    The sparkle is mid-grey (≤ #808080) while the artwork is a pure-white
  #    (#ffffff) outline. Rather than paint a black box over the corner (which
  #    clips artwork that reaches into it — e.g. kidney beans), clamp that
  #    corner's levels: everything at/below mid-grey collapses to black, the
  #    white outline is preserved untouched.
  # 2. Remove all black → transparent
  # 3. Trim transparent padding
  region_w=$(( w * 22 / 100 ))
  region_h=$(( h * 20 / 100 ))
  region_x=$(( w - region_w ))
  region_y=$(( h - region_h ))

  magick "$raw" \
    -region "${region_w}x${region_h}+${region_x}+${region_y}" -level 55%,100% +region \
    -fuzz 25% -transparent black \
    -trim +repage \
    "$out"
done

echo "Done."

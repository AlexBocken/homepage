#!/usr/bin/env bash
# Subset NotoColorEmoji to only the emojis we actually use.
# Requires: fonttools (provides pyftsubset) and woff2 (provides woff2_compress)
#
# Source font: system-installed NotoColorEmoji.ttf
# Output: static/fonts/NotoColorEmoji.woff2 + .ttf

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$PROJECT_ROOT/static/fonts"

SRC_FONT="/usr/share/fonts/noto/NotoColorEmoji.ttf"

if [ ! -f "$SRC_FONT" ]; then
	echo "Error: Source font not found at $SRC_FONT" >&2
	exit 1
fi

# ─── Fixed list of emojis to include ────────────────────────────────
# Recipe icons (from database + hardcoded)
# Season/liturgical: ☀️ ✝️ ❄️ 🌷 🍂 🎄 🐇
# Food/recipe: 🍽️ 🥫
# UI/cospend categories: 🛒 🛍️ 🚆 ⚡ 🎉 🤝 💸
# Status/feedback: ❤️ 🖤 ✅ ❌ 🚀 ⚠️ ✨ 🔄
# Features: 📋 🖼️ 📖 🤖 🌐 🔐 🔍 🚫

EMOJIS="☀✝❄🌷🍂🎄🐇🍽🥫🛒🛍🚆⚡🎉🤝💸❤🖤✅❌🚀⚠✨🔄📋🖼📖🤖🌐🔐🔍🚫"
# ────────────────────────────────────────────────────────────────────

# Build Unicode codepoint list from the emoji string
UNICODES=""
for char in $(echo "$EMOJIS" | grep -oP '.'); do
	code=$(printf 'U+%04X' "'$char")
	if [ -n "$UNICODES" ]; then
		UNICODES="$UNICODES,$code"
	else
		UNICODES="$code"
	fi
done

echo "Subsetting NotoColorEmoji with $(echo "$EMOJIS" | grep -oP '.' | wc -l) glyphs..."

# Subset to TTF
pyftsubset "$SRC_FONT" \
	--unicodes="$UNICODES" \
	--output-file="$OUT_DIR/NotoColorEmoji.ttf" \
	--no-ignore-missing-unicodes

# Convert to WOFF2
woff2_compress "$OUT_DIR/NotoColorEmoji.ttf"

ORIG_SIZE=$(stat -c%s "$SRC_FONT" 2>/dev/null || stat -f%z "$SRC_FONT")
TTF_SIZE=$(stat -c%s "$OUT_DIR/NotoColorEmoji.ttf" 2>/dev/null || stat -f%z "$OUT_DIR/NotoColorEmoji.ttf")
WOFF2_SIZE=$(stat -c%s "$OUT_DIR/NotoColorEmoji.woff2" 2>/dev/null || stat -f%z "$OUT_DIR/NotoColorEmoji.woff2")

echo "Done!"
echo "  Original: $(numfmt --to=iec "$ORIG_SIZE")"
echo "  TTF:      $(numfmt --to=iec "$TTF_SIZE")"
echo "  WOFF2:    $(numfmt --to=iec "$WOFF2_SIZE")"

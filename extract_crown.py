#!/usr/bin/env python3
"""Extract crown emoji from Symbola font as SVG."""

import fontforge
import sys

# Path to Symbola font
font_path = "/usr/share/fonts/TTF/Symbola.ttf"

# Dove emoji Unicode codepoint
dove_codepoint = 0x1F54A  # U+1F54A 🕊️

# Output SVG file
output_path = "dove.svg"

try:
    # Open the font
    font = fontforge.open(font_path)

    # Select the dove glyph by Unicode codepoint
    if dove_codepoint in font:
        glyph = font[dove_codepoint]

        # Export as SVG
        glyph.export(output_path)

        print(f"✓ Successfully extracted dove emoji to {output_path}")
        print(f"  Glyph name: {glyph.glyphname}")
        print(f"  Unicode: U+{dove_codepoint:04X}")
    else:
        print(f"✗ Dove emoji (U+{dove_codepoint:04X}) not found in font")
        sys.exit(1)

    font.close()

except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

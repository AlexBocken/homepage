#!/usr/bin/env python3
"""
Script to replace inline formatCurrency functions with shared formatter utilities
"""

import re
import sys

files_to_update = [
    "/home/alex/.local/src/homepage/src/routes/cospend/+page.svelte",
    "/home/alex/.local/src/homepage/src/routes/cospend/payments/+page.svelte",
    "/home/alex/.local/src/homepage/src/routes/cospend/payments/view/[id]/+page.svelte",
    "/home/alex/.local/src/homepage/src/routes/cospend/recurring/+page.svelte",
    "/home/alex/.local/src/homepage/src/routes/cospend/settle/+page.svelte",
]

def process_file(filepath):
    print(f"Processing: {filepath}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Check if already has the import
        has_formatter_import = 'from \'$lib/utils/formatters\'' in content or 'from "$lib/utils/formatters"' in content

        # Find the <script> tag
        script_match = re.search(r'(<script[^>]*>)', content)
        if not script_match:
            print(f"  ⚠️  No <script> tag found")
            return False

        # Add import if not present
        if not has_formatter_import:
            script_tag = script_match.group(1)
            # Find where to insert (after <script> tag)
            script_end = script_match.end()

            # Get existing imports to find the right place
            imports_section_match = re.search(r'<script[^>]*>(.*?)(?:\n\n|\n  export|\n  let)', content, re.DOTALL)
            if imports_section_match:
                imports_end = imports_section_match.end() - len(imports_section_match.group(0).split('\n')[-1])
                insert_pos = imports_end
            else:
                insert_pos = script_end

            new_import = "\n  import { formatCurrency } from '$lib/utils/formatters';"
            content = content[:insert_pos] + new_import + content[insert_pos:]
            print(f"  ✓ Added import")

        # Remove the formatCurrency function definition
        # Pattern for the function with different variations
        patterns = [
            r'\n  function formatCurrency\(amount\) \{\n    return new Intl\.NumberFormat\(\'de-CH\',\s*\{\n\s*style:\s*\'currency\',\n\s*currency:\s*\'CHF\'\n\s*\}\)\.format\(amount\);\n  \}',
            r'\n  function formatCurrency\(amount,\s*currency\s*=\s*\'CHF\'\) \{\n    return new Intl\.NumberFormat\(\'de-CH\',\s*\{\n\s*style:\s*\'currency\',\n\s*currency:\s*currency\n\s*\}\)\.format\(amount\);\n  \}',
        ]

        for pattern in patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, '', content)
                print(f"  ✓ Removed formatCurrency function")
                break

        # Check if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Updated successfully")
            return True
        else:
            print(f"  ⚠️  No changes needed")
            return False

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Replacing formatCurrency functions with shared utilities")
    print("=" * 60)

    success_count = 0
    for filepath in files_to_update:
        if process_file(filepath):
            success_count += 1
        print()

    print("=" * 60)
    print(f"Summary: {success_count}/{len(files_to_update)} files updated")
    print("=" * 60)

if __name__ == "__main__":
    main()

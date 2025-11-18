#!/usr/bin/env python3
"""
Script to update formatCurrency calls to include CHF and de-CH parameters
"""

import re

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
        changes = 0

        # Pattern 1: formatCurrency(amount) -> formatCurrency(amount, 'CHF', 'de-CH')
        # But skip if already has parameters
        def replace_single_param(match):
            amount = match.group(1)
            # Check if amount already contains currency parameter (contains comma followed by quote)
            if ", '" in amount or ', "' in amount:
                return match.group(0)  # Already has parameters, skip
            return f"formatCurrency({amount}, 'CHF', 'de-CH')"

        content, count1 = re.subn(
            r'formatCurrency\(([^)]+)\)',
            replace_single_param,
            content
        )
        changes += count1

        if changes > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Updated {changes} formatCurrency calls")
            return True
        else:
            print(f"  ⚠️  No changes needed")
            return False

    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("Updating formatCurrency calls with CHF and de-CH params")
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

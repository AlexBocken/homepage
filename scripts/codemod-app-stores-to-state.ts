/**
 * Migrate `$app/stores` (deprecated) to `$app/state` (rune-based).
 *
 * For each .svelte file:
 *   - Rewrite `from '$app/stores'` → `from '$app/state'`
 *   - For each named import, drop the `$` prefix from auto-subscriptions:
 *       `$page.url.pathname` → `page.url.pathname`
 *       `$navigating` → `navigating`
 *       `$updated` → `updated`
 *     Aliased imports (`page as appPage`) are tracked, so `$appPage` becomes `appPage`.
 *
 * Skips:
 *   - Non-.svelte files (server-only code uses getRequestEvent instead).
 *   - Files importing other things from $app/stores that don't have a state equivalent
 *     (none observed in this repo).
 *
 * Run:  pnpm exec vite-node scripts/codemod-app-stores-to-state.ts [--dry]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = 'src';
const DRY = process.argv.includes('--dry');

const STORES_IMPORT_RE =
	/import\s*\{([^}]+)\}\s*from\s*['"]\$app\/stores['"]\s*;?/;

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const s = statSync(p);
		if (s.isDirectory()) walk(p, out);
		else if (extname(p) === '.svelte') out.push(p);
	}
	return out;
}

function parseImports(inner: string): Array<{ orig: string; local: string }> {
	return inner
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((spec) => {
			const m = spec.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
			if (!m) return null;
			return { orig: m[1], local: m[2] ?? m[1] };
		})
		.filter((x): x is { orig: string; local: string } => x !== null);
}

function rewriteFile(src: string): { code: string; changed: boolean } {
	const m = STORES_IMPORT_RE.exec(src);
	if (!m) return { code: src, changed: false };

	const imports = parseImports(m[1]);
	if (imports.length === 0) return { code: src, changed: false };

	// Replace the import path; preserve the same import shape.
	let out = src.replace(STORES_IMPORT_RE, (full) =>
		full.replace(/['"]\$app\/stores['"]/, "'$app/state'")
	);

	// Drop `$` prefix from each local name where it appears as a store
	// auto-subscription (i.e. $name followed by a non-word boundary).
	for (const { local } of imports) {
		const re = new RegExp(`\\$${local}\\b`, 'g');
		out = out.replace(re, local);
	}

	return { code: out, changed: out !== src };
}

const files = walk(SRC);
let changed = 0;
for (const f of files) {
	const orig = readFileSync(f, 'utf8');
	const { code, changed: didChange } = rewriteFile(orig);
	if (!didChange) continue;
	if (!DRY) writeFileSync(f, code);
	changed++;
	console.log(`  ${f}`);
}
console.log(`\n${DRY ? '[dry] ' : ''}${changed} files migrated`);

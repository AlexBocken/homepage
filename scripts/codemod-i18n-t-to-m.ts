/**
 * Migrate i18n call sites from t('key', lang) to t.key (or t[expr] for
 * dynamic keys), where t = m[lang] derived once per file. Generic version
 * — pass the i18n module path and the directories to scan.
 *
 * Usage:
 *   pnpm exec vite-node scripts/codemod-i18n-t-to-m.ts \
 *       --module=$lib/js/cospendI18n \
 *       --root=src/routes/'[cospendRoot=cospendRoot]' \
 *       --root=src/lib/components/cospend \
 *       [--dry]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const modArg = args.find((a) => a.startsWith('--module='));
if (!modArg) {
	console.error('missing --module=<path>');
	process.exit(1);
}
const modulePath = modArg.slice('--module='.length);
const roots = args
	.filter((a) => a.startsWith('--root='))
	.map((a) => a.slice('--root='.length));
if (roots.length === 0) {
	console.error('missing --root=<dir> (at least one)');
	process.exit(1);
}
const fnFlag = args.find((a) => a.startsWith('--fn='));
const FN = fnFlag ? fnFlag.slice('--fn='.length) : 't';
const mFlag = args.find((a) => a.startsWith('--m='));
const M_NAME = mFlag ? mFlag.slice('--m='.length) : 'm';

// Match imports from any path ending in the module basename — call sites
// reach calendarI18n via wildly different relative-path depths, so we
// don't pin the full path.
function esc(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const IMPORT_RE = new RegExp(
	`import\\s*\\{([^}]+)\\}\\s*from\\s*(['"])([^'"]*${esc(modulePath)})\\2\\s*;?`
);

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const s = statSync(p);
		if (s.isDirectory()) walk(p, out);
		else if (extname(p) === '.svelte' || extname(p) === '.ts') out.push(p);
	}
	return out;
}

function migrate(src: string): { code: string; changed: boolean } {
	const m0 = IMPORT_RE.exec(src);
	if (!m0) return { code: src, changed: false };

	const items = m0[1].split(',').map((s) => s.trim()).filter(Boolean);
	if (!items.includes(FN)) return { code: src, changed: false };

	const matchedPath = m0[3];

	// 1. Rewrite import: drop FN, ensure M_NAME present. Preserve original path.
	const fnIdx = items.indexOf(FN);
	items.splice(fnIdx, 1);
	if (!items.includes(M_NAME)) items.push(M_NAME);
	let out = src.replace(IMPORT_RE, `import { ${items.join(', ')} } from '${matchedPath}';`);

	// 2. Insert `const FN = $derived(M_NAME[lang]);` at the right spot.
	const insertion = `const ${FN} = $derived(${M_NAME}[lang]);`;
	let inserted = false;

	const langDerivedRe =
		/^([ \t]*)(const\s+lang\s*=\s*\$derived\((?:[^()]|\([^()]*\))+\)\s*;?)([ \t]*\n)/m;
	if (langDerivedRe.test(out)) {
		out = out.replace(langDerivedRe, (_, indent, decl, nl) => {
			inserted = true;
			return `${indent}${decl}${nl}${indent}${insertion}${nl}`;
		});
	}

	if (!inserted) {
		const propsRe =
			/^([ \t]*)(let\s*\{[\s\S]*?\}\s*=\s*\$props(?:<[\s\S]*?>)?\(\)\s*;?)([ \t]*\n)/m;
		out = out.replace(propsRe, (full, indent, decl, nl) => {
			if (!/\blang\b/.test(decl)) return full;
			inserted = true;
			return `${indent}${decl}${nl}${indent}${insertion}${nl}`;
		});
	}

	if (!inserted) {
		console.warn(`  WARN: could not auto-insert \`${insertion}\` — manual fix needed`);
	}

	// Build dynamic regex for FN(...) — escape `1962`-style suffixes.
	const fnEsc = FN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// 3. FN('static_key', lang) → FN.static_key (snake_case OR camelCase identifier)
	out = out.replace(
		new RegExp(`\\b${fnEsc}\\(\\s*['"]([a-zA-Z_$][a-zA-Z0-9_$]*)['"]\\s*,\\s*lang\\s*\\)`, 'g'),
		`${FN}.$1`
	);
	// 4. FN(<expr>, lang) → FN[<expr>]
	out = out.replace(
		new RegExp(`\\b${fnEsc}\\(((?:[^()]|\\([^()]*\\))+?)\\s*,\\s*lang\\s*\\)`, 'g'),
		(_match, expr) => `${FN}[${expr.trim()}]`
	);

	return { code: out, changed: out !== src };
}

let total = 0;
for (const root of roots) {
	for (const f of walk(root)) {
		const orig = readFileSync(f, 'utf8');
		const { code, changed } = migrate(orig);
		if (!changed) continue;
		if (!DRY) writeFileSync(f, code);
		total++;
		console.log(`  ${f}`);
	}
}
console.log(`\n${DRY ? '[dry] ' : ''}${total} files migrated`);

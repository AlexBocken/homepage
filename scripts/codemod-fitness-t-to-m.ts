/**
 * Migrate fitness call sites from t('key', lang) to t.key (or t[expr] for
 * dynamic keys), where t = m[lang] derived once per file.
 *
 * Run:  pnpm exec vite-node scripts/codemod-fitness-t-to-m.ts [--dry]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOTS = ['src/routes/fitness', 'src/lib/components/fitness'];

const IMPORT_RE =
	/import\s*\{([^}]+)\}\s*from\s*['"]\$lib\/js\/fitnessI18n['"]\s*;?/;

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
	if (!items.includes('t')) return { code: src, changed: false };

	// 1. Rewrite import: drop `t`, ensure `m` present.
	const tIdx = items.indexOf('t');
	items.splice(tIdx, 1);
	if (!items.includes('m')) items.push('m');
	let out = src.replace(IMPORT_RE, `import { ${items.join(', ')} } from '$lib/js/fitnessI18n';`);

	// 2. Insert `const t = $derived(m[lang]);` at the right spot, depending
	//    on how `lang` enters scope.
	//    Pattern A: `const lang = $derived(...)` — derived from URL
	//    Pattern B: `let { ... lang ... } = $props()` — passed as prop (single or multi-line)
	let inserted = false;

	// Pattern A: derived. Allow up to two levels of nested parens inside
	// $derived(...) so detectFitnessLang(page.url.pathname) matches.
	const langDerivedRe =
		/^([ \t]*)(const\s+lang\s*=\s*\$derived\((?:[^()]|\([^()]*\))+\)\s*;?)([ \t]*\n)/m;
	if (langDerivedRe.test(out)) {
		out = out.replace(langDerivedRe, (_, indent, decl, nl) => {
			inserted = true;
			return `${indent}${decl}${nl}${indent}const t = $derived(m[lang]);${nl}`;
		});
	}

	// Pattern B: $props() destructure, possibly spanning multiple lines.
	// Match any `let { ... } = $props()` and only insert if `lang` is in it.
	if (!inserted) {
		const propsRe =
			/^([ \t]*)(let\s*\{[\s\S]*?\}\s*=\s*\$props\(\)\s*;?)([ \t]*\n)/m;
		out = out.replace(propsRe, (full, indent, decl, nl) => {
			if (!/\blang\b/.test(decl)) return full;
			inserted = true;
			return `${indent}${decl}${nl}${indent}const t = $derived(m[lang]);${nl}`;
		});
	}

	if (!inserted) {
		console.warn(`  WARN: could not auto-insert \`const t = $derived(m[lang])\` — manual fix needed`);
	}

	// 3. Replace t('static_key', lang) → t.static_key
	out = out.replace(
		/\bt\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*,\s*lang\s*\)/g,
		't.$1'
	);

	// 4. Replace t(<expr>, lang) → t[<expr>] for any remaining call.
	//    Expression captured allows up to single-level nested parens, which
	//    covers our /** @type {FitnessKey} */ (expr) patterns.
	out = out.replace(
		/\bt\(((?:[^()]|\([^()]*\))+?)\s*,\s*lang\s*\)/g,
		(match, expr) => {
			const trimmed = expr.trim();
			return `t[${trimmed}]`;
		}
	);

	return { code: out, changed: out !== src };
}

let total = 0;
for (const root of ROOTS) {
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

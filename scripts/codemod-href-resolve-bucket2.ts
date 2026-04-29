/**
 * Bucket 2 codemod: replace template-literal hrefs that start with `/` and
 * contain `{expr}` interpolations with `resolve(routeId, { ... })`.
 *
 * Skips:
 *  - tags: <link>, <image> (svg), <use>, <textPath>
 *  - hrefs not starting with `/`
 *  - hrefs containing `?` or `#` (query/fragment) — handle manually
 *  - mixed segments like `view-{id}`
 *  - paths matching 0 or >1 routes
 *
 * Run:  pnpm exec vite-node scripts/codemod-href-resolve-bucket2.ts [--dry] [--verbose]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = 'src';
const ROUTES = 'src/routes';
const DRY = process.argv.includes('--dry');

const SKIP_TAGS = new Set(['link', 'image', 'use', 'textpath']);

// --- Route tree ---------------------------------------------------------

type Dir = { name: string; subdirs: Dir[] };

function loadTree(dir: string, name = ''): Dir {
	const subdirs: Dir[] = [];
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (!e.isDirectory()) continue;
		if (e.name === 'api' || e.name.startsWith('.')) continue;
		subdirs.push(loadTree(join(dir, e.name), e.name));
	}
	return { name, subdirs };
}

const ROUTE_TREE = loadTree(ROUTES);

// --- Path parsing -------------------------------------------------------

type HrefSeg = { kind: 'literal'; text: string } | { kind: 'param'; expr: string };

function hasUnbracedChar(path: string, chars: string): boolean {
	let depth = 0;
	for (const c of path) {
		if (c === '{') depth++;
		else if (c === '}') depth--;
		else if (depth === 0 && chars.includes(c)) return true;
	}
	return false;
}

function parsePath(path: string): HrefSeg[] | null {
	if (!path.startsWith('/')) return null;
	if (hasUnbracedChar(path, '?#')) return null;
	if (path.includes('//')) return null;
	// Split on `/`, but only outside of {...}
	const parts: string[] = [];
	let buf = '';
	let depth = 0;
	for (const c of path.slice(1)) {
		if (c === '{') { depth++; buf += c; }
		else if (c === '}') { depth--; buf += c; }
		else if (c === '/' && depth === 0) { parts.push(buf); buf = ''; }
		else buf += c;
	}
	parts.push(buf);
	if (parts.length === 1 && parts[0] === '') return [];
	const segs: HrefSeg[] = [];
	for (const p of parts) {
		if (p === '') return null;
		const m = p.match(/^\{([^}]+)\}$/);
		if (m) {
			segs.push({ kind: 'param', expr: m[1] });
		} else if (!p.includes('{') && !p.includes('}')) {
			segs.push({ kind: 'literal', text: p });
		} else {
			return null; // mixed segment
		}
	}
	return segs;
}

function paramInfo(
	name: string
): { paramName: string; isRest: boolean } | null {
	let body = name;
	if (body.startsWith('[[') && body.endsWith(']]')) {
		body = body.slice(2, -2);
	} else if (body.startsWith('[') && body.endsWith(']')) {
		body = body.slice(1, -1);
	} else return null;
	const isRest = body.startsWith('...');
	if (isRest) body = body.slice(3);
	const eq = body.indexOf('=');
	const paramName = eq >= 0 ? body.slice(0, eq) : body;
	return { paramName, isRest };
}

// --- Tree matching ------------------------------------------------------

type Match = { routeId: string; params: Array<[string, string]> };

function matchTree(
	dir: Dir,
	segs: HrefSeg[],
	routePath: string[],
	params: Array<[string, string]>
): Match[] {
	if (segs.length === 0) {
		const id = routePath.length === 0 ? '/' : '/' + routePath.join('/');
		return [{ routeId: id, params }];
	}
	const [seg, ...rest] = segs;
	const out: Match[] = [];
	for (const sub of dir.subdirs) {
		// Route groups are transparent — they don't consume a URL segment
		// but DO appear in the route ID.
		if (sub.name.startsWith('(') && sub.name.endsWith(')')) {
			out.push(...matchTree(sub, segs, [...routePath, sub.name], params));
			continue;
		}
		if (seg.kind === 'literal') {
			if (sub.name === seg.text) {
				out.push(
					...matchTree(sub, rest, [...routePath, sub.name], params)
				);
			}
		} else {
			const info = paramInfo(sub.name);
			if (info && !info.isRest) {
				out.push(
					...matchTree(sub, rest, [...routePath, sub.name], [
						...params,
						[info.paramName, seg.expr]
					])
				);
			}
		}
	}
	return out;
}

// --- Output formatting --------------------------------------------------

function isIdentifier(s: string): boolean {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);
}

function formatParams(params: Array<[string, string]>): string {
	if (params.length === 0) return '';
	const items = params.map(([name, expr]) => {
		const trimmed = expr.trim();
		if (isIdentifier(trimmed) && trimmed === name) return name;
		return `${name}: ${trimmed}`;
	});
	return `, { ${items.join(', ')} }`;
}

// --- Rewrite ------------------------------------------------------------

const HREF_RE =
	/(<([A-Za-z][\w.-]*)\b[^>]*?\s)href="(\/[^"]*\{[^"]*\}[^"]*)"/gs;

type Skip = { path: string; reason: string };

function rewriteHrefs(src: string): {
	code: string;
	changed: number;
	skipped: Skip[];
} {
	let changed = 0;
	const skipped: Skip[] = [];
	const code = src.replace(HREF_RE, (full, prefix, tag, path) => {
		if (SKIP_TAGS.has(tag.toLowerCase())) return full;
		const segs = parsePath(path);
		if (!segs) {
			skipped.push({ path, reason: 'unparsable (mixed/query/fragment)' });
			return full;
		}
		const matches = matchTree(ROUTE_TREE, segs, [], []);
		if (matches.length === 0) {
			skipped.push({ path, reason: 'no route match' });
			return full;
		}
		if (matches.length > 1) {
			skipped.push({
				path,
				reason: `${matches.length} ambiguous matches: ${matches.map((m) => m.routeId).join(' | ')}`
			});
			return full;
		}
		const { routeId, params } = matches[0];
		changed++;
		return `${prefix}href={resolve('${routeId}'${formatParams(params)})}`;
	});
	return { code, changed, skipped };
}

// --- Import injection ---------------------------------------------------

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/;
const PATHS_IMPORT_RE =
	/import\s*\{([^}]*)\}\s*from\s*['"]\$app\/paths['"]\s*;?/;

function ensureResolveImport(src: string): string {
	const m = SCRIPT_RE.exec(src);
	if (!m) {
		return `<script lang="ts">\n\timport { resolve } from '$app/paths';\n</script>\n\n${src}`;
	}
	const [scriptFull, attrs, body] = m;
	const pm = PATHS_IMPORT_RE.exec(body);
	if (pm) {
		const inner = pm[1];
		if (/\bresolve\b/.test(inner)) return src;
		const merged = inner.trim().replace(/,?\s*$/, '') + ', resolve';
		const newImport = `import { ${merged} } from '$app/paths';`;
		const newBody = body.replace(PATHS_IMPORT_RE, newImport);
		return src.replace(scriptFull, `<script${attrs}>${newBody}</script>`);
	}
	const im = body.match(/^([ \t]*)import\b/m);
	const indent = im ? im[1] : '\t';
	const opening = `<script${attrs}>`;
	return src.replace(
		scriptFull,
		`${opening}\n${indent}import { resolve } from '$app/paths';${body}</script>`
	);
}

// --- Driver -------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const s = statSync(p);
		if (s.isDirectory()) walk(p, out);
		else if (extname(p) === '.svelte') out.push(p);
	}
	return out;
}

const files = walk(SRC);
let totalFiles = 0;
let totalReplacements = 0;
const allSkipped: Array<{ file: string } & Skip> = [];

for (const f of files) {
	const orig = readFileSync(f, 'utf8');
	const { code, changed, skipped } = rewriteHrefs(orig);
	for (const s of skipped) allSkipped.push({ file: f, ...s });
	if (changed === 0) continue;
	const final = ensureResolveImport(code);
	if (!DRY) writeFileSync(f, final);
	totalFiles++;
	totalReplacements += changed;
	console.log(`${changed.toString().padStart(3)}  ${f}`);
}

console.log(
	`\n${DRY ? '[dry] ' : ''}${totalReplacements} replacements across ${totalFiles} files`
);
if (allSkipped.length > 0) {
	console.log(`\n--- ${allSkipped.length} skipped hrefs ---`);
	for (const s of allSkipped) {
		console.log(`  ${s.file}\n    ${s.path}  [${s.reason}]`);
	}
}

/**
 * Bucket 1 codemod: replace literal href="/path" with href={resolve('/path')}
 * in .svelte files, and inject `import { resolve } from '$app/paths'`.
 *
 * Skips:
 *  - non-anchor tags: <link>, <image> (svg), <use>
 *  - external/protocol URLs: http(s)://, //host, mailto:, tel:
 *  - fragments (#...) and empty values
 *  - existing dynamic hrefs ({...})
 *
 * Run:  pnpm exec vite-node scripts/codemod-href-resolve.ts [--dry]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const DRY = process.argv.includes('--dry');

const SKIP_TAGS = new Set(['link', 'image', 'use']);

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const s = statSync(p);
		if (s.isDirectory()) walk(p, out);
		else if (extname(p) === '.svelte') out.push(p);
	}
	return out;
}

/**
 * Match: opening of element, then its attributes, then href="/...".
 * Group 1 = full prefix incl. tag-name, Group 2 = tag name, Group 3 = path.
 */
// Excludes `{` and `}` so Svelte template interpolations inside the
// attribute value (e.g. href="/{lang}/foo") are NOT treated as literals.
const HREF_RE =
	/(<([A-Za-z][\w.-]*)\b[^>]*?\s)href="(\/[^"{}]*)"/gs;

function rewriteHrefs(src: string): { code: string; changed: number } {
	let changed = 0;
	const code = src.replace(HREF_RE, (full, prefix, tag, path) => {
		if (SKIP_TAGS.has(tag.toLowerCase())) return full;
		// Skip protocol-relative just in case
		if (path.startsWith('//')) return full;
		changed++;
		return `${prefix}href={resolve('${path}')}`;
	});
	return { code, changed };
}

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/;
const PATHS_IMPORT_RE =
	/import\s*\{([^}]*)\}\s*from\s*['"]\$app\/paths['"]\s*;?/;

function ensureResolveImport(src: string): string {
	const scriptMatch = SCRIPT_RE.exec(src);
	if (!scriptMatch) {
		// No script tag — prepend a TS one.
		return `<script lang="ts">\n\timport { resolve } from '$app/paths';\n</script>\n\n${src}`;
	}
	const [scriptFull, attrs, body] = scriptMatch;
	const pathsMatch = PATHS_IMPORT_RE.exec(body);
	if (pathsMatch) {
		const inner = pathsMatch[1];
		if (/\bresolve\b/.test(inner)) return src; // already imported
		const merged = inner.trim().replace(/,?\s*$/, '') + ', resolve';
		const newImport = `import { ${merged} } from '$app/paths';`;
		const newBody = body.replace(PATHS_IMPORT_RE, newImport);
		return src.replace(scriptFull, `<script${attrs}>${newBody}</script>`);
	}
	// Inject new import line. Detect indent from first import line if present.
	const importMatch = body.match(/^([ \t]*)import\b/m);
	const indent = importMatch ? importMatch[1] : '\t';
	// Insert right after the opening script tag's newline.
	const opening = `<script${attrs}>`;
	const insertion = `\n${indent}import { resolve } from '$app/paths';`;
	const newScript = opening + insertion + body + '</script>';
	return src.replace(scriptFull, newScript);
}

function processFile(path: string): { changed: number } {
	const orig = readFileSync(path, 'utf8');
	const { code: rewritten, changed } = rewriteHrefs(orig);
	if (changed === 0) return { changed: 0 };
	const final = ensureResolveImport(rewritten);
	if (!DRY) writeFileSync(path, final);
	return { changed };
}

const files = walk(ROOT);
let totalFiles = 0;
let totalReplacements = 0;
for (const f of files) {
	const { changed } = processFile(f);
	if (changed > 0) {
		totalFiles++;
		totalReplacements += changed;
		console.log(`${changed.toString().padStart(3)}  ${f}`);
	}
}
console.log(
	`\n${DRY ? '[dry] ' : ''}${totalReplacements} replacements across ${totalFiles} files`
);

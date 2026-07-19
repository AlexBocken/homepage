/**
 * One-off: rewrite the already-generated German food names in Swiss High German.
 *
 * The two pipelines (import-bls-nutrition.ts, translate-usda-nutrition.ts) normalise
 * through src/lib/data/helvetisms.ts from now on, but neither can be re-run cheaply:
 * the BLS source xlsx is not in the repo, and a USDA re-run needs the DeepL key. So
 * this applies the same table to what is committed. It is idempotent and safe to run
 * again after adding a rule.
 *
 *   pnpm exec vite-node scripts/swissify-food-names.ts [--check]
 *
 * --check reports what would change and exits non-zero if anything would — that is
 * the drift check between the table and the generated files.
 *
 * Touches only the German names. Rerun scripts/embed-bls-db.ts afterwards: the BLS
 * embeddings are built from nameDe, so renaming without re-embedding leaves the
 * semantic search matching against wording that no longer exists.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { toSwissGerman } from '../src/lib/data/helvetisms';

const check = process.argv.includes('--check');

const BLS_DB = resolve('src/lib/data/blsDb.ts');
const SEGMENTS = resolve('src/lib/data/usdaSegmentsDe.json');
const NAMES = resolve('src/lib/data/nutritionNamesDe.json');

let changed = 0;
const sample: string[] = [];

function note(before: string, after: string) {
	changed++;
	if (sample.length < 20) sample.push(`  - ${before}\n  + ${after}`);
}

/** blsDb.ts is generated TypeScript with JSON-shaped entries; rewrite nameDe in place. */
function swissifyBls() {
	const src = readFileSync(BLS_DB, 'utf-8');
	const out = src.replace(/"nameDe":"((?:[^"\\]|\\.)*)"/g, (whole, raw: string) => {
		const before = JSON.parse(`"${raw}"`) as string;
		const after = toSwissGerman(before);
		if (after === before) return whole;
		note(before, after);
		return `"nameDe":${JSON.stringify(after)}`;
	});
	if (out !== src && !check) writeFileSync(BLS_DB, out, 'utf-8');
	return out !== src;
}

/** The USDA artifacts are flat string→string JSON; only the values are German. */
function swissifyJson(path: string) {
	const src = readFileSync(path, 'utf-8');
	const obj = JSON.parse(src) as Record<string, string>;
	let dirty = false;
	for (const [key, value] of Object.entries(obj)) {
		const after = toSwissGerman(value);
		if (after === value) continue;
		note(value, after);
		obj[key] = after;
		dirty = true;
	}
	if (dirty && !check) {
		const sorted: Record<string, string> = {};
		for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
		writeFileSync(path, JSON.stringify(sorted, null, '\t') + '\n', 'utf-8');
	}
	return dirty;
}

const dirty = [swissifyBls(), swissifyJson(SEGMENTS), swissifyJson(NAMES)].some(Boolean);

console.log(`${changed} names ${check ? 'would change' : 'rewritten'}`);
if (sample.length) console.log(sample.join('\n'));
if (check && dirty) {
	console.error('\nGenerated German names are not normalised — run without --check.');
	process.exit(1);
}

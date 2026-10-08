/**
 * Review report for the pantry search ($lib/server/pantryVocabulary): the
 * ingredient vocabulary it builds from the recipes, every "covers" link it
 * inferred, and the lines it dropped. Read the links once after adding recipes;
 * a wrong one goes into NOT_COVERS in $lib/data/pantryOverrides.
 *
 * Read-only.
 *
 *   pnpm exec vite-node scripts/pantry-vocabulary-report.ts           # summary + links
 *   pnpm exec vite-node scripts/pantry-vocabulary-report.ts --all     # also the whole vocabulary
 *   pnpm exec vite-node scripts/pantry-vocabulary-report.ts --dropped # lines read as prose
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { Recipe } from '../src/models/Recipe';
import { buildPantryIndex, type PantrySource } from '../src/lib/server/pantryVocabulary';
import { cleanIngredientLine } from '../src/lib/js/pantryNames';

const args = process.argv.slice(2);

function mongoUrl(): string {
	if (process.env.MONGO_URL) return process.env.MONGO_URL;
	const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
	const m = readFileSync(envPath, 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
	if (!m) throw new Error('MONGO_URL not set and not found in .env');
	return m[1];
}

await mongoose.connect(mongoUrl());
const docs = await Recipe.find({}, 'short_name ingredients translations.en.ingredients').lean<PantrySource[]>();
await mongoose.disconnect();

const t = performance.now();
const index = buildPantryIndex(docs);
const ms = performance.now() - t;

const lines = docs.flatMap((d) => (d.ingredients ?? []).flatMap((s: any) => s.list ?? []));
const dropped = lines.filter((l: any) => l?.name && cleanIngredientLine(l.name, 'de').keys.length === 0);
const needs = index.recipes.reduce((s, r) => s + r.needs.length, 0);

console.log(
	`${docs.length} recipes, ${lines.length} lines → ${index.items.length} ingredients ` +
		`(${needs} required lines, ${dropped.length} dropped) in ${ms.toFixed(1)}ms`,
);
console.log(`basics: ${index.basics.join(', ')}`);

console.log('\n## Covers (having the first counts as having the rest)');
for (const [key, covered] of Object.entries(index.covers).sort()) console.log(`  ${key} → ${covered.join(', ')}`);

const shown = args.includes('--all') ? index.items : index.items.slice(0, 80);
console.log(`\n## Vocabulary${args.includes('--all') ? '' : ' (top 80)'}`);
for (const item of shown) console.log(`  ${String(item.count).padStart(4)}  ${item.de}  /  ${item.en}`);

const noEnglish = index.items.filter((i) => i.en === i.de);
console.log(`\n${noEnglish.length} without a distinct English label: ${noEnglish.map((i) => i.key).slice(0, 40).join(', ')}`);

if (args.includes('--dropped')) {
	console.log('\n## Dropped as prose');
	for (const l of dropped as any[]) console.log(`  ${l.name}`);
}

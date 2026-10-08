/**
 * Tuning report for "Ähnliche Rezepte" — runs the live metric
 * ($lib/server/recipeSimilarity) over the whole collection and prints, per
 * recipe, the closest matches with each score's parts, plus the timings and
 * the distribution the weights should be judged by.
 *
 * Read-only.
 *
 *   pnpm exec vite-node scripts/recipe-similarity-report.ts               # every recipe
 *   pnpm exec vite-node scripts/recipe-similarity-report.ts ruchbrot pizza  # just these
 *   pnpm exec vite-node scripts/recipe-similarity-report.ts --kernel        # also list the same-food pairs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { Recipe } from '../src/models/Recipe';
import { BLS_DB } from '../src/lib/data/blsDb';
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';
import {
	MIN_SCORE,
	RELATED_MAX,
	buildNeighbours,
	featureScale,
	ingredientKey,
	nutrientProfile,
	pickRelated,
	scoreMatrix,
	type SimilaritySource,
} from '../src/lib/server/recipeSimilarity';

const args = process.argv.slice(2);
const showKernel = args.includes('--kernel');
const only = args.filter((a) => !a.startsWith('--'));

function mongoUrl(): string {
	if (process.env.MONGO_URL) return process.env.MONGO_URL;
	const envPath = resolve(import.meta.dirname ?? '.', '..', '.env');
	const m = readFileSync(envPath, 'utf-8').match(/^MONGO_URL="?([^"\n]+)"?/m);
	if (!m) throw new Error('MONGO_URL not set and not found in .env');
	return m[1];
}

const strip = (s: string) => s.replace(/&shy;|<[^>]*>/g, '');

await mongoose.connect(mongoUrl());
const docs = await Recipe.find(
	{},
	'short_name name category tags isBaseRecipe ingredients nutritionMappings cachedPer100g',
)
	.sort({ short_name: 1 })
	.lean<(SimilaritySource & { name: string })[]>();

const bls = new Map(BLS_DB.map((e) => [e.blsCode, e]));
const usda = new Map(NUTRITION_DB.map((e) => [e.fdcId, e]));
const scale = featureScale([...BLS_DB, ...NUTRITION_DB].map((e) => e.per100g as unknown as Record<string, unknown>));
const profiles = new Map<string, Float64Array>();
const labels = new Map<string, string>();
for (const doc of docs) {
	for (const m of doc.nutritionMappings ?? []) {
		const key = ingredientKey(m);
		if (!key || profiles.has(key)) continue;
		const e = key.startsWith('b:') ? bls.get(key.slice(2)) : usda.get(Number(key.slice(2)));
		if (!e) continue;
		profiles.set(key, nutrientProfile(e.per100g as unknown as Record<string, unknown>, scale));
		labels.set(key, 'nameDe' in e ? e.nameDe : e.name);
	}
}

// Same slicing as the server, so "longest slice" means what it means there.
let sliceStart = performance.now();
let longest = 0;
const tick = async () => {
	const now = performance.now();
	if (now - sliceStart < 8) return;
	longest = Math.max(longest, now - sliceStart);
	await new Promise((r) => setImmediate(r));
	sliceStart = performance.now();
};

let t = performance.now();
const neighbours = await buildNeighbours(profiles, tick);
const kernelMs = performance.now() - t;
const pairs = [...neighbours.values()].reduce((s, row) => s + row.length, 0) / 2;

t = performance.now();
const { n, scores, components } = await scoreMatrix(docs, neighbours, { tick, withComponents: true });
const scoreMs = performance.now() - t;
longest = Math.max(longest, performance.now() - sliceStart);

const c = components!;
if (showKernel) {
	console.log('\n## Same-food pairs');
	for (const [key, row] of neighbours) {
		for (const [other, k] of row) {
			if (key < other) console.log(`  ${k.toFixed(2)}  ${labels.get(key)} ≈ ${labels.get(other)}`);
		}
	}
}
const fmt = (x: number) => x.toFixed(2);
for (let i = 0; i < n; i++) {
	if (only.length && !only.includes(docs[i].short_name)) continue;
	const ranked = [...Array(n).keys()]
		.filter((j) => j !== i)
		.sort((a, b) => scores[i * n + b] - scores[i * n + a])
		.slice(0, 5);
	const picked = new Set(
		pickRelated(scores, n, i, (j) => !docs[j].isBaseRecipe || !!docs[i].isBaseRecipe),
	);
	console.log(`\n## ${strip(docs[i].name)} [${docs[i].category}]`);
	for (const j of ranked) {
		const k = i * n + j;
		console.log(
			`  ${picked.has(j) ? '★' : ' '} ${fmt(scores[k])}  ${strip(docs[j].name)} [${docs[j].category}]` +
				`  ing=${fmt(c.ing[k])} tag=${fmt(c.tag[k])} mac=${fmt(c.mac[k])} cat=${fmt(c.cat[k])}`,
		);
	}
}

const best = [...Array(n).keys()]
	.map((i) => Math.max(...[...Array(n).keys()].map((j) => (i === j ? 0 : scores[i * n + j]))))
	.sort((a, b) => a - b);
const q = (p: number) => fmt(best[Math.floor(p * (n - 1))]);
const withAny = best.filter((s) => s >= MIN_SCORE).length;
const full = [...Array(n).keys()].filter(
	(i) => pickRelated(scores, n, i, (j) => !docs[j].isBaseRecipe || !!docs[i].isBaseRecipe).length === RELATED_MAX,
).length;

console.log(`
${n} recipes, ${profiles.size} ingredients, ${pairs} kernel pairs
kernel ${Math.round(kernelMs)}ms, scoring ${Math.round(scoreMs)}ms, longest slice ${longest.toFixed(1)}ms
best-score quantiles p0 ${q(0)} · p10 ${q(0.1)} · p25 ${q(0.25)} · p50 ${q(0.5)} · p75 ${q(0.75)} · p100 ${q(1)}
≥1 suggestion: ${withAny}/${n} (${Math.round((100 * withAny) / n)}%) · all ${RELATED_MAX}: ${full}/${n}`);

await mongoose.disconnect();

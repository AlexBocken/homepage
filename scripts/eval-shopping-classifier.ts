/**
 * Measure the shopping category classifier against real manual labels:
 * 5-fold cross-validation over the DB's manual labels, training on
 * the static set plus the other folds (as production would). Read-only.
 *
 * Mind that manual labels skew hard — most were corrections of wrong guesses —
 * so this underestimates accuracy on everyday items.
 *
 * Run: MONGO_URL='mongodb://…' pnpm exec vite-node scripts/eval-shopping-classifier.ts [--errors]
 */
import { pipeline } from '@huggingface/transformers';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { baseTrainingItems } from '../src/lib/data/shoppingTraining';
import { ShoppingClassifier, loadEmbeddingSpace, type TrainingSample } from '../src/lib/server/shoppingClassifier';
import { ShoppingItemCategory } from '../src/models/ShoppingItemCategory';

const FOLDS = 5;
const SEEDS = [1, 2, 3];
const showErrors = process.argv.includes('--errors');

const url = process.env.MONGO_URL;
if (!url) throw new Error('MONGO_URL is not set');
await mongoose.connect(url, { serverSelectionTimeoutMS: 8000 });
// Before scripts/shopping-labels-migrate.ts has run there's no `source` yet;
// fall back to its heuristic (overrides update in place, guesses never do).
const labels = (await ShoppingItemCategory.find({}, { embedding: 0 }).lean()).filter(
	(d) =>
		d.source === 'manual' ||
		(!d.source && new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime() > 1000)
);
await mongoose.disconnect();
if (labels.length < FOLDS) throw new Error(`only ${labels.length} manual labels`);

const { vectors, project } = loadEmbeddingSpace(
	JSON.parse(readFileSync(resolve('src/lib/data/shoppingTrainingEmbeddings.json'), 'utf-8'))
);
const embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-base', { dtype: 'q8' });
const embed = async (t: string) =>
	project((await embedder(`query: ${t}`, { pooling: 'mean', normalize: true })).data as Float32Array);
for (const l of labels) if (!vectors.has(l.normalizedName)) vectors.set(l.normalizedName, await embed(l.normalizedName));

const labelled = new Set(labels.map((l) => l.normalizedName));
const base: TrainingSample[] = [];
for (const item of baseTrainingItems()) {
	// leave labelled texts out of the static set, or the test would see its answer
	if (labelled.has(item.text)) continue;
	base.push({ text: item.text, category: item.category, vector: vectors.get(item.text) ?? (await embed(item.text)) });
}
const asSample = (l: (typeof labels)[number]): TrainingSample => ({
	text: l.normalizedName,
	category: l.category,
	vector: vectors.get(l.normalizedName)!,
	weight: 2
});

const accs: number[] = [];
const errors = new Map<string, string>();
for (const seed of SEEDS) {
	let s = seed;
	const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
	const order = labels.map((_, i) => i).sort(() => rand() - 0.5);
	let ok = 0;
	for (let f = 0; f < FOLDS; f++) {
		const test = order.filter((_, k) => k % FOLDS === f).map((i) => labels[i]);
		const train = order.filter((_, k) => k % FOLDS !== f).map((i) => asSample(labels[i]));
		const clf = new ShoppingClassifier();
		await clf.train([...base, ...train]);
		for (const l of test) {
			const p = clf.predict(l.normalizedName, vectors.get(l.normalizedName)!);
			if (p.category === l.category) ok++;
			else if (seed === SEEDS[0]) errors.set(l.normalizedName, `${p.category} (labelled ${l.category})`);
		}
	}
	accs.push(ok / labels.length);
}

const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
console.log(`${labels.length} manual labels, ${base.length} static items`);
console.log(`Cross-validated accuracy: ${(mean * 100).toFixed(1)}%  (${accs.map((a) => (a * 100).toFixed(1)).join(' / ')})`);
if (showErrors) for (const [name, e] of errors) console.log(`  ${name} → ${e}`);

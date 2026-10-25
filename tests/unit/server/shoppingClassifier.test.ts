import { describe, it, expect } from 'vitest';
import {
	ShoppingClassifier,
	charNgrams,
	loadEmbeddingSpace,
	type EmbeddingFile,
	type TrainingSample
} from '$lib/server/shoppingClassifier';
import { baseTrainingItems } from '$lib/data/shoppingTraining';
import embeddingFile from '$lib/data/shoppingTrainingEmbeddings.json';

const zero = [0, 0];
const sample = (text: string, category: string, vector: number[] = zero): TrainingSample => ({
	text,
	category,
	vector
});

describe('charNgrams', () => {
	it("matches sklearn's char_wb analyzer", () => {
		// TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 5)).build_analyzer()('tk Ei')
		expect(charNgrams('tk Ei')).toEqual([
			' t', 'tk', 'k ', ' tk', 'tk ', ' tk ',
			' e', 'ei', 'i ', ' ei', 'ei ', ' ei '
		]);
	});
});

describe('ShoppingClassifier', () => {
	it('generalises word parts through the n-gram block', async () => {
		const clf = new ShoppingClassifier();
		await clf.train([
			sample('magerquark', 'Milchprodukte'),
			sample('rahmquark', 'Milchprodukte'),
			sample('vollmilch', 'Milchprodukte'),
			sample('rotwein', 'Getränke'),
			sample('weisswein', 'Getränke'),
			sample('apfelsaft', 'Getränke')
		]);
		expect(clf.predict('kräuterquark', zero).category).toBe('Milchprodukte');
		expect(clf.predict('glühwein', zero).category).toBe('Getränke');
	});

	it('separates names that share no spelling through the embedding block', async () => {
		const clf = new ShoppingClassifier();
		await clf.train([
			sample('tahini', 'Gewürze & Saucen', [1, 0]),
			sample('harissa', 'Gewürze & Saucen', [0.9, 0.1]),
			sample('prosecco', 'Getränke', [0, 1]),
			sample('cava', 'Getränke', [0.1, 0.9])
		]);
		expect(clf.predict('sambal', [0.95, 0.05]).category).toBe('Gewürze & Saucen');
		expect(clf.predict('crémant', [0.05, 0.95]).category).toBe('Getränke');
	});

	it('reports a margin to the runner-up', async () => {
		const clf = new ShoppingClassifier();
		await clf.train([sample('milch', 'Milchprodukte'), sample('bier', 'Getränke')]);
		const p = clf.predict('milch', zero);
		expect(p.margin).toBeGreaterThan(0);
		expect(p.score - p.margin).toBeLessThan(p.score);
	});
});

describe('loadEmbeddingSpace', () => {
	it('decodes int8 vectors and projects raw ones into the same space', () => {
		// 3-d raw space, 2 components (x and y axes), mean (1, 0, 0), norm 2
		const file: EmbeddingFile = {
			model: 'test',
			rawDim: 3,
			dim: 2,
			mean: [1, 0, 0],
			components: [1, 0, 0, 0, 1, 0],
			norm: 2,
			scale: 0.5,
			texts: ['a'],
			data: Buffer.from(Int8Array.from([127, -127]).buffer).toString('base64')
		};
		const { vectors, project } = loadEmbeddingSpace(file);
		expect(Array.from(vectors.get('a')!)).toEqual([0.5, -0.5]);
		expect(Array.from(project([2, -1, 7]))).toEqual([0.5, -0.5]);
		expect(() => project([1, 2])).toThrow();
	});
});

describe('shipped training data', () => {
	const items = baseTrainingItems();
	const { vectors } = loadEmbeddingSpace(embeddingFile as EmbeddingFile);

	it('has an embedding for every training item', () => {
		const missing = items.filter((i) => !vectors.has(i.text)).map((i) => i.text);
		// re-run scripts/embed-shopping-training.ts after editing the training data
		expect(missing).toEqual([]);
	});

	// A regression guard for the data, not a quality target: held-out static
	// items are mostly one-off names (wine grapes, French cheeses, pasta shapes)
	// with nothing similar left in training, so this sits around 82% while real
	// shopping lists score higher.
	it('classifies held-out items reasonably', async () => {
		const held = items.filter((_, i) => i % 25 === 0);
		const clf = new ShoppingClassifier();
		await clf.train(
			items.filter((_, i) => i % 25 !== 0).map((i) => ({ ...i, vector: vectors.get(i.text)! }))
		);
		const correct = held.filter((i) => clf.predict(i.text, vectors.get(i.text)!).category === i.category);
		expect(correct.length / held.length).toBeGreaterThan(0.75);
	}, 30_000);
});

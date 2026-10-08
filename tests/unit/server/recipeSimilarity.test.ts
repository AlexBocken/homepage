import { describe, it, expect } from 'vitest';
import {
	KERNEL_MAX,
	KERNEL_SAME,
	MIN_SCORE,
	buildIdf,
	buildNeighbours,
	featureScale,
	categoryAffinities,
	ingredientKey,
	ingredientProfile,
	ingredientWeight,
	kernelValue,
	macroSimilarity,
	macroVector,
	nutrientDistance,
	nutrientProfile,
	pickRelated,
	scoreMatrix,
	type SimilaritySource,
} from '$lib/server/recipeSimilarity';

type Line = [name: string, amount: string, key: string, gramsPerUnit?: number];

/** A recipe whose lines map straight onto ingredient keys (`b:…` / `u:…`). */
function recipe(
	short_name: string,
	lines: Line[],
	over: Partial<SimilaritySource> = {},
): SimilaritySource {
	return {
		_id: `id-${short_name}`,
		short_name,
		category: 'Hauptspeise',
		tags: [],
		ingredients: [{ type: 'section', list: lines.map(([name, amount]) => ({ name, amount, unit: 'g' })) }],
		nutritionMappings: lines.map(([, , key, gramsPerUnit = 1], i) => ({
			sectionIndex: 0,
			ingredientIndex: i,
			gramsPerUnit,
			...(key.startsWith('b:') ? { source: 'bls', blsCode: key.slice(2) } : { source: 'usda', fdcId: Number(key.slice(2)) }),
		})),
		cachedPer100g: { protein: 5, fat: 5, carbs: 20, sugars: 2, calories: 150 },
		...over,
	};
}

const none = () => undefined;

describe('ingredientKey', () => {
	it('follows the mapping source over a stale id from an earlier match', () => {
		expect(ingredientKey({ source: 'bls', blsCode: 'C1', fdcId: 9, sectionIndex: 0, ingredientIndex: 0 })).toBe('b:C1');
		expect(ingredientKey({ source: 'usda', blsCode: 'C1', fdcId: 9, sectionIndex: 0, ingredientIndex: 0 })).toBe('u:9');
		expect(ingredientKey({ sectionIndex: 0, ingredientIndex: 0 })).toBeNull();
	});
});

describe('ingredientProfile', () => {
	it('weighs lines with the shared amount parser and skips excluded ones', () => {
		const r = recipe('a', [
			['Mehl', '1,5', 'b:FLOUR', 100],
			['Salz', '½', 'b:SALT', 4],
			['Wasser', '300', 'b:WATER'],
		]);
		r.nutritionMappings![2].excluded = true;
		const p = ownProfile(r);
		expect(p.get('b:FLOUR')).toBe(150);
		expect(p.get('b:SALT')).toBe(2);
		expect(p.has('b:WATER')).toBe(false);
	});

	it('expands a linked base recipe into its ingredients, scaled', () => {
		const dough = recipe('pizzateig', [
			['Mehl', '500', 'b:FLOUR'],
			['Wasser', '300', 'b:WATER'],
		]);
		const pizza = recipe('pizza', [
			['<a href="pizzateig">Pizzateig</a>', '1', 'b:IGNORED'],
			['Tomate', '200', 'b:TOMATO'],
		]);
		pizza.nutritionMappings![0] = { sectionIndex: 0, ingredientIndex: 0, recipeRef: 'pizzateig', recipeRefMultiplier: 0.5 };
		const p = ingredientProfile(pizza, (req) => (req.slug === 'pizzateig' ? dough : undefined));
		expect(p.get('b:FLOUR')).toBe(250);
		expect(p.get('b:WATER')).toBe(150);
		expect(p.get('b:TOMATO')).toBe(200);
		expect(p.has('b:IGNORED')).toBe(false);
	});

	it('stops at the depth limit instead of looping on a self-reference', () => {
		const r = recipe('loop', [['<a href="loop">Loop</a>', '1', 'b:X']]);
		r.nutritionMappings![0] = { sectionIndex: 0, ingredientIndex: 0, recipeRef: 'loop' };
		expect(() => ingredientProfile(r, () => r)).not.toThrow();
	});
});

function ownProfile(r: SimilaritySource) {
	return ingredientProfile(r, none);
}

describe('weights', () => {
	it('gives a rare ingredient more IDF than a common one', () => {
		const idf = buildIdf([['salt', 'rye'], ['salt'], ['salt'], ['salt']], 4);
		expect(idf.get('rye')!).toBeGreaterThan(idf.get('salt')!);
	});

	it('keeps a presence floor so a trace ingredient still counts', () => {
		expect(ingredientWeight(0, 1)).toBeCloseTo(0.4);
		expect(ingredientWeight(1, 1)).toBeCloseTo(1);
		// A heavy ingredient outweighs a light one, but by far less than its mass.
		expect(ingredientWeight(0.9, 1) / ingredientWeight(0.01, 1)).toBeLessThan(3);
	});
});

describe('kernel', () => {
	it('is 1 for the same food and fades to 0 for different ones', () => {
		expect(kernelValue(0)).toBe(1);
		expect(kernelValue(KERNEL_SAME)).toBe(1);
		expect(kernelValue((KERNEL_SAME + KERNEL_MAX) / 2)).toBeCloseTo(0.5);
		expect(kernelValue(KERNEL_MAX)).toBe(0);
	});

	it('puts two sugars together and keeps butter away from oil', async () => {
		const sugar = { calories: 400, carbs: 99.8, sugars: 99.8 };
		const icing = { calories: 398, carbs: 99.5, sugars: 99.5 };
		const butter = { calories: 741, fat: 83, saturatedFat: 52, cholesterol: 240, vitaminA: 650, calcium: 15 };
		const oil = { calories: 884, fat: 100, saturatedFat: 17 };
		const scale = featureScale([sugar, icing, butter, oil, { calories: 30, protein: 2, carbs: 5, fiber: 2, vitaminC: 40 }]);
		const profiles = new Map([
			['b:SUGAR', nutrientProfile(sugar, scale)],
			['b:ICING', nutrientProfile(icing, scale)],
			['b:BUTTER', nutrientProfile(butter, scale)],
			['u:OIL', nutrientProfile(oil, scale)],
		]);
		expect(nutrientDistance(profiles.get('b:SUGAR')!, profiles.get('b:ICING')!)).toBeLessThan(KERNEL_SAME);
		const neighbours = await buildNeighbours(profiles);
		expect(neighbours.get('b:SUGAR')!.map(([k]) => k)).toEqual(['b:ICING']);
		expect(neighbours.get('b:ICING')!.map(([k]) => k)).toEqual(['b:SUGAR']);
		expect(neighbours.get('b:BUTTER')).toEqual([]);
	});
});

describe('macro and category', () => {
	it('tells a dessert from a savoury dish', () => {
		const sweet = macroVector({ protein: 3, fat: 10, carbs: 50, sugars: 40, calories: 300 });
		const savoury = macroVector({ protein: 15, fat: 10, carbs: 10, sugars: 1, calories: 180 });
		expect(macroSimilarity(sweet, sweet)).toBe(1);
		expect(macroSimilarity(sweet, savoury)).toBeLessThan(0.5);
		expect(macroSimilarity(sweet, null)).toBe(0.5);
	});

	it('learns which categories are close from their recipes', () => {
		// Ingredient ids: 0 flour, 1 sugar, 2 butter, 3 carrot, 4 stock.
		const v = (pairs: [number, number][]) => ({
			idx: Int32Array.from(pairs, (p) => p[0]),
			w: Float64Array.from(pairs, (p) => p[1]),
		});
		const { index, matrix } = categoryAffinities(
			['Kuchen', 'Guetzli', 'Suppe', undefined],
			[{ vectors: [v([[0, 1], [1, 1], [2, 1]]), v([[0, 1], [1, 1], [2, 0.5]]), v([[3, 1], [4, 1]]), v([[0, 1]])], dim: 5 }],
		);
		const m = index.size;
		const at = (a: string, b: string) => matrix[index.get(a)! * m + index.get(b)!];
		expect(m).toBe(3);
		expect(at('Kuchen', 'Kuchen')).toBe(1);
		expect(at('Kuchen', 'Guetzli')).toBeGreaterThan(0.9);
		expect(at('Guetzli', 'Kuchen')).toBe(at('Kuchen', 'Guetzli'));
		expect(at('Kuchen', 'Suppe')).toBe(0);
	});

	it('averages over the signals', () => {
		const one = { idx: Int32Array.of(0), w: Float64Array.of(1) };
		const other = { idx: Int32Array.of(1), w: Float64Array.of(1) };
		const { index, matrix } = categoryAffinities(
			['A', 'B'],
			[
				{ vectors: [one, one], dim: 2 },
				{ vectors: [one, other], dim: 2 },
			],
		);
		expect(matrix[index.get('A')! * 2 + index.get('B')!]).toBeCloseTo(0.5);
	});
});

describe('scoreMatrix', () => {
	const breadA = recipe('ruchbrot', [['Ruchmehl', '500', 'b:RUCH'], ['Sauerteig', '100', 'b:SOUR'], ['Salz', '10', 'b:SALT']], {
		category: 'Brot',
		tags: ['Sauerteig', 'Brot'],
	});
	const breadB = recipe('luzernerbrot', [['Ruchmehl', '450', 'b:RUCH'], ['Sauerteig', '80', 'b:SOUR'], ['Salz', '9', 'b:SALT']], {
		category: 'Brot',
		tags: ['Sauerteig'],
	});
	const soup = recipe('suppe', [['Karotte', '300', 'b:CARROT'], ['Salz', '5', 'b:SALT']], { category: 'Suppe' });

	it('is symmetric and ranks the matching bread above the soup', async () => {
		const { n, scores } = await scoreMatrix([breadA, breadB, soup], new Map());
		expect(n).toBe(3);
		expect(scores[0 * 3 + 1]).toBeCloseTo(scores[1 * 3 + 0]);
		expect(scores[0 * 3 + 1]).toBeGreaterThan(MIN_SCORE);
		expect(scores[0 * 3 + 1]).toBeGreaterThan(scores[0 * 3 + 2]);
		expect(scores[0]).toBe(0);
	});

	it('lets the kernel bridge two ids for the same food', async () => {
		const a = recipe('mousse', [['Schokolade', '200', 'b:CHOC']], { category: 'Dessert' });
		const b = recipe('brownies', [['Chocolate', '200', 'u:1']], { category: 'Dessert' });
		const exact = await scoreMatrix([a, b], new Map());
		const soft = await scoreMatrix(
			[a, b],
			new Map([
				['b:CHOC', [['u:1', 0.9]]],
				['u:1', [['b:CHOC', 0.9]]],
			]),
		);
		expect(soft.scores[1]).toBeGreaterThan(exact.scores[1]);
	});
});

describe('pickRelated', () => {
	// Row 0 is the recipe; 1 and 2 are near-duplicates of each other, 3 differs.
	const n = 4;
	const s = new Float32Array(n * n);
	const set = (i: number, j: number, v: number) => (s[i * n + j] = s[j * n + i] = v);
	set(0, 1, 0.7);
	set(0, 2, 0.69);
	set(0, 3, 0.6);
	set(1, 2, 0.95);
	set(1, 3, 0.1);
	set(2, 3, 0.1);

	it('prefers variety over a second near-duplicate', () => {
		expect(pickRelated(s, n, 0, () => true, { max: 2 })).toEqual([1, 3]);
	});

	it('drops candidates below the minimum and respects eligibility', () => {
		expect(pickRelated(s, n, 0, (j) => j !== 1, { max: 3, min: 0.65 })).toEqual([2]);
	});

	it('skips manual picks and diversifies against them', () => {
		expect(pickRelated(s, n, 0, () => true, { max: 1, exclude: [1] })).toEqual([3]);
	});
});

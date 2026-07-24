import { describe, it, expect } from 'vitest';
import {
	foodLeaf, mealLeaves, blendPer100g, flattenComponents,
} from '../../../src/lib/server/foodLogComponents';

describe('foodLeaf', () => {
	it('is a single leaf carrying the amount and frozen portions', () => {
		const portions = [{ description: '1 medium', grams: 120 }];
		const [leaf, ...rest] = foodLeaf(
			{ source: 'usda', sourceId: '167512', portions, selectedPortion: portions[0] },
			240,
		);
		expect(rest).toHaveLength(0);
		expect(leaf).toMatchObject({ source: 'usda', sourceId: '167512', amountGrams: 240 });
		expect(leaf.portions).toBe(portions);
		expect(leaf.selectedPortion).toEqual({ description: '1 medium', grams: 120 });
	});
});

describe('mealLeaves', () => {
	const meal = {
		ingredients: [
			{ source: 'bls', sourceId: 'C131000', amountGrams: 150 },
			{ source: 'usda', sourceId: '2000', amountGrams: 50 },
		],
	};

	it('takes the logged amount as a proportion of the meal weight', async () => {
		// Meal weighs 200 g; logging 100 g takes half of each ingredient.
		const leaves = await mealLeaves(meal, 100);
		expect(leaves.map(l => [l.source, l.sourceId, l.amountGrams])).toEqual([
			['bls', 'C131000', 75],
			['usda', '2000', 25],
		]);
	});

	it('is identity in mass when logging the whole meal', async () => {
		const leaves = await mealLeaves(meal, 200);
		expect(leaves.reduce((s, l) => s + l.amountGrams, 0)).toBeCloseTo(200);
	});

	it('returns nothing for an empty or weightless meal', async () => {
		expect(await mealLeaves({ ingredients: [] }, 100)).toEqual([]);
		expect(await mealLeaves({ ingredients: [{ source: 'bls', sourceId: 'x', amountGrams: 0 }] }, 100)).toEqual([]);
	});
});

describe('blendPer100g', () => {
	const leaf = (amountGrams: number, per100g: any) => ({ source: 'bls', sourceId: 'x', amountGrams, per100g, name: null } as any);

	it('reproduces summed macros exactly (blend × total = Σ contributions)', () => {
		const comps = [leaf(100, { calories: 200, protein: 10 }), leaf(100, { calories: 400, protein: 30 })];
		const blend = blendPer100g(comps, 200);
		expect(blend.calories * 200 / 100).toBeCloseTo(200 + 400);
		expect(blend.protein * 200 / 100).toBeCloseTo(10 + 30);
	});

	it('keeps a key present if any leaf reports it, and its total honest', () => {
		// Only the USDA-shaped leaf reports selenium.
		const comps = [leaf(100, { calories: 100 }), leaf(100, { calories: 100, selenium: 40 })];
		const blend = blendPer100g(comps, 200);
		expect(blend.selenium * 200 / 100).toBeCloseTo(40);
	});

	it('omits a key no leaf reports', () => {
		const blend = blendPer100g([leaf(100, { calories: 100 })], 100);
		expect('selenium' in blend).toBe(false);
	});

	it('treats a dangling leaf (null per100g) as zero contribution', () => {
		const comps = [leaf(100, { calories: 300 }), { ...leaf(100, null) }];
		// Denominator is the full 200 g, so the resolved half still reads 150 kcal/100g.
		const blend = blendPer100g(comps as any, 200);
		expect(blend.calories).toBeCloseTo(150);
	});
});

describe('flattenComponents', () => {
	it('prefers each leaf\'s live name, falling back to the row name', () => {
		const flat = flattenComponents([
			{ name: 'Chili', components: [
				{ source: 'bls', sourceId: 'a', amountGrams: 50, per100g: {}, name: 'Kidney beans' },
				{ source: 'off', sourceId: 'b', amountGrams: 30, per100g: null, name: null },
			] } as any,
		]);
		expect(flat.map(f => f.name)).toEqual(['Kidney beans', 'Chili']);
	});
});

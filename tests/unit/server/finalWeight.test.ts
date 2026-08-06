import { describe, it, expect } from 'vitest';
import { resolveFinalWeight, hasFinalWeightOverride } from '../../../src/lib/js/finalWeight';
import { computePer100g, type ReferencedTotals } from '../../../src/lib/server/recipePer100g';

describe('resolveFinalWeight', () => {
	it('falls back to the ingredient sum when nothing is set', () => {
		expect(resolveFinalWeight(1000)).toBe(1000);
		expect(resolveFinalWeight(1000, null)).toBe(1000);
		expect(resolveFinalWeight(1000, { mode: 'auto' })).toBe(1000);
	});

	it('takes an absolute weight verbatim', () => {
		expect(resolveFinalWeight(1000, { mode: 'absolute', grams: 600 })).toBe(600);
	});

	it('applies a signed percent against the sum', () => {
		expect(resolveFinalWeight(1000, { mode: 'relative', percent: -10 })).toBe(900);
		expect(resolveFinalWeight(1000, { mode: 'relative', percent: 25 })).toBe(1250);
	});

	// A half-typed form field must never leave a recipe dividing by zero.
	it('ignores unusable values instead of collapsing the weight', () => {
		expect(resolveFinalWeight(1000, { mode: 'absolute', grams: null })).toBe(1000);
		expect(resolveFinalWeight(1000, { mode: 'absolute', grams: 0 })).toBe(1000);
		expect(resolveFinalWeight(1000, { mode: 'absolute', grams: -5 })).toBe(1000);
		expect(resolveFinalWeight(1000, { mode: 'relative', percent: null })).toBe(1000);
		expect(resolveFinalWeight(1000, { mode: 'relative', percent: -100 })).toBe(1000);
		expect(resolveFinalWeight(1000, { mode: 'relative', percent: -150 })).toBe(1000);
	});

	it('reports whether an override actually changes anything', () => {
		expect(hasFinalWeightOverride({ mode: 'auto' })).toBe(false);
		expect(hasFinalWeightOverride({ mode: 'relative', percent: 0 })).toBe(false);
		expect(hasFinalWeightOverride({ mode: 'absolute', grams: null })).toBe(false);
		expect(hasFinalWeightOverride({ mode: 'relative', percent: -10 })).toBe(true);
		expect(hasFinalWeightOverride({ mode: 'absolute', grams: 600 })).toBe(true);
	});
});

describe('computePer100g with a finished-weight override', () => {
	// 1000 g of an ingredient at 100 kcal/100 g = 1000 kcal in the pot.
	const recipe = {
		ingredients: [{ name: 'Teig', list: [{ name: 'Mehl', amount: '1000 g' }] }],
		nutritionMappings: [
			{
				sectionIndex: 0,
				ingredientIndex: 0,
				source: 'bls',
				matchMethod: 'manual',
				gramsPerUnit: 1,
				defaultAmount: 1000,
				per100g: { calories: 100 },
			},
		],
	};

	it('divides by the ingredient sum when unset', () => {
		const result = computePer100g(recipe)!;
		expect(result.totalGrams).toBe(1000);
		expect(result.per100g.calories).toBeCloseTo(100);
	});

	// The calories do not evaporate with the water, so losing 10% of the weight
	// makes every per-100 g figure correspondingly denser.
	it('keeps the nutrients and moves only the denominator', () => {
		const result = computePer100g({ ...recipe, finalWeight: { mode: 'relative', percent: -10 } })!;
		expect(result.totalGrams).toBe(900);
		expect(result.per100g.calories).toBeCloseTo(1000 / 900 * 100);
	});

	it('accepts an absolute finished weight', () => {
		const result = computePer100g({ ...recipe, finalWeight: { mode: 'absolute', grams: 600 } })!;
		expect(result.totalGrams).toBe(600);
		expect(result.per100g.calories).toBeCloseTo(1000 / 600 * 100);
	});

	it('applies to the total including base recipes, not just own ingredients', () => {
		const references: ReferencedTotals[] = [
			{
				shortName: 'sauerteig',
				name: 'Sauerteig',
				sectionIndex: 1,
				nutrition: { calories: 500 },
				totalGrams: 1000,
				baseMultiplier: 1,
				mapped: 1,
				mappable: 1,
				coverage: 1,
			},
		];
		const result = computePer100g(
			{ ...recipe, finalWeight: { mode: 'relative', percent: -50 } },
			references
		)!;
		// (1000 own + 1000 base) halved.
		expect(result.totalGrams).toBe(1000);
		expect(result.per100g.calories).toBeCloseTo(150);
	});
});

import { describe, it, expect } from 'vitest';
import { computeTotals, computePer100g, type ReferencedTotals } from '$lib/server/recipePer100g';

/** A mapping carrying its own per100g, so the test needs neither BLS nor USDA. */
function mapping(sectionIndex: number, ingredientIndex: number, over: Record<string, any> = {}) {
	return {
		sectionIndex,
		ingredientIndex,
		matchMethod: 'exact',
		gramsPerUnit: 1,
		excluded: false,
		per100g: { calories: 100, protein: 10 },
		...over,
	};
}

function section(name: string | undefined, list: { name: string; unit?: string; amount?: string }[]) {
	return { name, type: 'section', list };
}

describe('computeTotals', () => {
	it('sums each line at its resolved weight', () => {
		const recipe = {
			ingredients: [section('Teig', [
				{ name: 'Mehl', unit: 'g', amount: '200' },
				{ name: 'Zucker', unit: 'g', amount: '50' },
			])],
			nutritionMappings: [mapping(0, 0), mapping(0, 1)],
		};
		const { totals, totalGrams, mapped, mappable } = computeTotals(recipe);
		expect(totalGrams).toBe(250);
		expect(totals.calories).toBe(250);
		expect(mapped).toBe(2);
		expect(mappable).toBe(2);
	});

	it('counts a line with no amount as one unit', () => {
		const recipe = {
			ingredients: [section(undefined, [{ name: 'Olivenöl', unit: 'EL', amount: '' }])],
			nutritionMappings: [mapping(0, 0, { gramsPerUnit: 15 })],
		};
		expect(computeTotals(recipe).totalGrams).toBe(15);
	});

	it('does not count an ingredient that names another section', () => {
		// "Teig" listed inside "Belag" is the section above, repeated as a component.
		// Its weight is already in the sum, so counting it would double the dough.
		const recipe = {
			ingredients: [
				section('Teig', [{ name: 'Mehl', unit: 'g', amount: '200' }]),
				section('Belag', [
					{ name: 'Teig', unit: 'g', amount: '200' },
					{ name: 'Käse', unit: 'g', amount: '100' },
				]),
			],
			nutritionMappings: [mapping(0, 0), mapping(1, 0), mapping(1, 1)],
		};
		expect(computeTotals(recipe).totalGrams).toBe(300);
	});

	it('leaves an anchor-linked line to the reference resolver', () => {
		const recipe = {
			ingredients: [section(undefined, [
				{ name: '<a href="pizzateig">Pizzateig</a>', unit: 'g', amount: '400' },
				{ name: 'Käse', unit: 'g', amount: '100' },
			])],
			nutritionMappings: [mapping(0, 0), mapping(0, 1)],
		};
		expect(computeTotals(recipe).totalGrams).toBe(100);
	});

	it('counts a skipped line as mappable but not mapped', () => {
		const recipe = {
			ingredients: [section(undefined, [
				{ name: 'Salz', unit: 'Prise', amount: '1' },
				{ name: 'Mehl', unit: 'g', amount: '200' },
			])],
			nutritionMappings: [mapping(0, 0, { excluded: true }), mapping(0, 1)],
		};
		const r = computeTotals(recipe);
		expect(r.totalGrams).toBe(200);
		expect(r.mapped).toBe(1);
		expect(r.mappable).toBe(1); // the skipped line is neither
	});

	it('counts an unmatched line as mappable and unmapped', () => {
		const recipe = {
			ingredients: [section(undefined, [{ name: 'Rätsel', unit: 'g', amount: '50' }])],
			nutritionMappings: [mapping(0, 0, { matchMethod: 'none', per100g: undefined })],
		};
		const r = computeTotals(recipe);
		expect(r.mapped).toBe(0);
		expect(r.mappable).toBe(1);
	});
});

describe('computePer100g', () => {
	const base = {
		ingredients: [section(undefined, [{ name: 'Käse', unit: 'g', amount: '100' }])],
		nutritionMappings: [mapping(0, 0, { per100g: { calories: 400 } })],
	};

	it('divides the totals by what the recipe weighs', () => {
		const r = computePer100g(base)!;
		expect(r.totalGrams).toBe(100);
		expect(r.per100g.calories).toBe(400);
	});

	it('adds a base recipe’s nutrients and its weight', () => {
		// The regression this guards: adding only the nutrients divided the dough's
		// calories by the toppings' grams, inflating every figure.
		const dough: ReferencedTotals = {
			shortName: 'pizzateig',
			name: 'Pizzateig',
			nutrition: { calories: 900 },
			totalGrams: 300,
			baseMultiplier: 1,
			mapped: 3,
			mappable: 3,
			coverage: 1,
		};
		const r = computePer100g(base, [dough])!;
		expect(r.totalGrams).toBe(400);
		expect(r.per100g.calories).toBe((400 + 900) / 400 * 100);
	});

	it('scales a base recipe by the fraction used', () => {
		const half: ReferencedTotals = {
			shortName: 'pizzateig', name: 'Pizzateig',
			nutrition: { calories: 900 }, totalGrams: 300,
			baseMultiplier: 0.5, mapped: 3, mappable: 3, coverage: 1,
		};
		const r = computePer100g(base, [half])!;
		expect(r.totalGrams).toBe(250);
		expect(r.per100g.calories).toBeCloseTo((400 + 450) / 250 * 100, 6);
	});

	it('is null when there is nothing to weigh', () => {
		expect(computePer100g({ ingredients: [], nutritionMappings: [] })).toBeNull();
		expect(computePer100g({
			ingredients: [section(undefined, [{ name: 'Salz', amount: '1' }])],
			nutritionMappings: [mapping(0, 0, { excluded: true })],
		})).toBeNull();
	});

	it('works for a recipe that is nothing but a base recipe', () => {
		const dough: ReferencedTotals = {
			shortName: 'pizzateig', name: 'Pizzateig',
			nutrition: { calories: 900 }, totalGrams: 300,
			baseMultiplier: 1, mapped: 3, mappable: 3, coverage: 1,
		};
		const r = computePer100g({ ingredients: [], nutritionMappings: [] }, [dough])!;
		expect(r.totalGrams).toBe(300);
		expect(r.per100g.calories).toBe(300);
	});
});

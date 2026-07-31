import { describe, it, expect } from 'vitest';
import {
	entryCalories, entriesCalories, energySources, atwaterCalories, ALCOHOL_KCAL,
} from '../../../src/lib/fitness/nutritionMath';

// BLS P162000, pale export beer: the food that exposed the bug these tests pin down.
// Its stated 42 kcal/100 g are nearly four times the 10.9 its macros account for,
// because 4.4 g of it is ethanol and ethanol is not a macro.
const BEER = { calories: 42, protein: 0.485, fat: 0, carbs: 2.238, alcohol: 4.394 };

describe('entryCalories', () => {
	it('uses the food’s own energy figure, not the Atwater sum of its macros', () => {
		// Half a litre of beer.
		expect(entryCalories({ per100g: BEER, amountGrams: 500 })).toBeCloseTo(210);
		// What the old macro-derived total would have said, for contrast.
		expect(atwaterCalories(BEER) * 5).toBeCloseTo(54.5, 1);
	});

	it('falls back to Atwater when the source published no energy value', () => {
		const noEnergy = { protein: 10, fat: 5, carbs: 20 };
		expect(entryCalories({ per100g: noEnergy, amountGrams: 200 })).toBeCloseTo(330);
	});

	it('treats a missing record as no energy rather than throwing', () => {
		expect(entryCalories({ per100g: null, amountGrams: 100 })).toBe(0);
		expect(entryCalories({ amountGrams: 100 })).toBe(0);
	});

	it('scales by the amount eaten', () => {
		expect(entriesCalories([
			{ per100g: BEER, amountGrams: 500 },
			{ per100g: { calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8 }, amountGrams: 120 },
		])).toBeCloseTo(210 + 106.8);
	});
});

describe('energySources', () => {
	it('attributes ethanol’s calories instead of losing them', () => {
		const e = energySources(BEER, BEER.calories);
		expect(e.alcohol).toBeCloseTo(4.394 * ALCOHOL_KCAL);
		// Macros + alcohol explain the stated figure to within rounding, so almost
		// nothing is left unattributed.
		expect(e.other).toBeLessThan(1);
	});

	it('reports what the macros cannot explain rather than absorbing it', () => {
		// A sweetener-heavy product: 40 g of polyols at 2.4 kcal/g are neither a macro
		// nor alcohol, and the stated energy is the only place they show up.
		const e = energySources({ protein: 0, fat: 0, carbs: 0 }, 96);
		expect(e.other).toBeCloseTo(96);
	});

	it('never returns a negative remainder', () => {
		// Stated energy below the Atwater sum happens with rounded label figures.
		const e = energySources({ protein: 10, fat: 10, carbs: 10 }, 100);
		expect(e.other).toBe(0);
	});
});

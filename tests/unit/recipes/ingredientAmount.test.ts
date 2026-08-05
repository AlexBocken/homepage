import { describe, it, expect } from 'vitest';
import { parseAmount, ingredientUnits, ingredientGrams } from '$lib/js/ingredientAmount';

describe('parseAmount', () => {
	it('reads the number formats recipe lines actually use', () => {
		expect(parseAmount('250')).toBe(250);
		expect(parseAmount(' 250 ')).toBe(250);
		expect(parseAmount('1,5')).toBe(1.5);
		expect(parseAmount('1.5')).toBe(1.5);
		expect(parseAmount('1/2')).toBe(0.5);
		expect(parseAmount('1 / 2')).toBe(0.5);
	});

	it('reads a mixed fraction as a whole plus its part', () => {
		// Two of the five copies this replaced could not do this and silently read
		// "1 1/2 EL" as 1 EL.
		expect(parseAmount('1 1/2')).toBe(1.5);
		expect(parseAmount('2 3/4')).toBe(2.75);
	});

	it('takes the midpoint of a range, either dash', () => {
		expect(parseAmount('2-3')).toBe(2.5);
		expect(parseAmount('2–3')).toBe(2.5); // en dash
		expect(parseAmount('2,5-3,5')).toBe(3);
	});

	it('is zero for anything it cannot read', () => {
		expect(parseAmount('')).toBe(0);
		expect(parseAmount('   ')).toBe(0);
		expect(parseAmount(undefined)).toBe(0);
		expect(parseAmount(null)).toBe(0);
		expect(parseAmount('etwas')).toBe(0);
		expect(parseAmount('nach Geschmack')).toBe(0);
	});
});

describe('ingredientUnits', () => {
	it('uses the stated amount when there is one', () => {
		expect(ingredientUnits({ defaultAmount: 0.5 }, '3')).toBe(3);
	});

	it('falls back to the resolved default amount', () => {
		expect(ingredientUnits({ defaultAmount: 0.5 }, '')).toBe(0.5);
	});

	it('counts one unit for a mapping written before the default was recorded', () => {
		expect(ingredientUnits({ defaultAmountUsed: true }, '')).toBe(1);
	});
});

describe('ingredientGrams', () => {
	it('multiplies units by the gram weight of one unit', () => {
		expect(ingredientGrams({ gramsPerUnit: 10 }, '2')).toBe(20);
	});

	it('scales by the recipe multiplier', () => {
		expect(ingredientGrams({ gramsPerUnit: 10 }, '2', 1.5)).toBe(30);
	});

	it('contributes nothing for a skipped line', () => {
		expect(ingredientGrams({ gramsPerUnit: 10, excluded: true }, '2')).toBe(0);
	});

	it('counts a skipped line only when asked, for a coverage denominator', () => {
		expect(ingredientGrams({ gramsPerUnit: 10, excluded: true }, '2', 1, { includeExcluded: true })).toBe(20);
	});

	it('contributes nothing when the unit could not be converted', () => {
		// gramsPerUnit is 0 for an unrecognised unit — an unknown weight, which is
		// the one case where adding nothing is the honest answer.
		expect(ingredientGrams({ gramsPerUnit: 0 }, '2')).toBe(0);
		expect(ingredientGrams({}, '2')).toBe(0);
	});

	it('uses the default amount when the line states none', () => {
		expect(ingredientGrams({ gramsPerUnit: 4, defaultAmount: 0.5 }, '')).toBe(2);
	});
});

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
		expect(parseAmount('2—3')).toBe(2.5); // em dash
		expect(parseAmount('2−3')).toBe(2.5); // minus sign
		expect(parseAmount('4-5')).toBe(4.5);
		expect(parseAmount('2,5-3,5')).toBe(3);
	});

	it('reads a spelled-out range', () => {
		expect(parseAmount('2 bis 3')).toBe(2.5);
		expect(parseAmount('2 to 3')).toBe(2.5);
	});

	// "~125 ml Milch" used to parse as 0, so the line fell through to its default
	// of one unit and a glass of milk was counted as a millilitre.
	it('ignores hedges in front of the number', () => {
		expect(parseAmount('~125')).toBe(125);
		expect(parseAmount('≈125')).toBe(125);
		expect(parseAmount('± 20')).toBe(20);
		expect(parseAmount('ca. 3')).toBe(3);
		expect(parseAmount('ca 3')).toBe(3);
		expect(parseAmount('etwa 250')).toBe(250);
		expect(parseAmount('ungefähr 2')).toBe(2);
		expect(parseAmount('approx. 4')).toBe(4);
		expect(parseAmount('about 4')).toBe(4);
		expect(parseAmount('knapp 500')).toBe(500);
		expect(parseAmount('gut 500')).toBe(500);
	});

	it('handles a hedge on a range, on either side', () => {
		expect(parseAmount('~2-3')).toBe(2.5);
		expect(parseAmount('ca. 2 bis ca. 3')).toBe(2.5);
	});

	it('reads a typographic fraction', () => {
		expect(parseAmount('½')).toBe(0.5);
		expect(parseAmount('1½')).toBe(1.5);
		expect(parseAmount('2¾')).toBe(2.75);
		expect(parseAmount('⅓')).toBeCloseTo(1 / 3);
	});

	// The unit lives in its own field, but people type it here anyway.
	it('ignores a unit left in the amount field', () => {
		expect(parseAmount('125 ml')).toBe(125);
		expect(parseAmount('2-3 EL')).toBe(2.5);
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

	it('counts a single occurrence when the line states no amount at all', () => {
		// "Olivenöl" with no amount means some olive oil, not none — and a mapping
		// written before defaultAmount existed carries no number either.
		expect(ingredientUnits({}, '')).toBe(1);
		expect(ingredientUnits({}, undefined)).toBe(1);
		expect(ingredientUnits({}, 'nach Geschmack')).toBe(1);
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

	it('counts one unit for an amountless line with no default', () => {
		// The regression this guards: "Olivenöl" with a hand-set 15 g per tablespoon
		// used to contribute nothing, so the gram figure looked like it did nothing.
		expect(ingredientGrams({ gramsPerUnit: 15 }, '')).toBe(15);
	});
});

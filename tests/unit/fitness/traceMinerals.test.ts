import { describe, it, expect } from 'vitest';
import {
	TRACE_MINERAL_KEYS, reportsTrace, traceTotals, traceCoverageNote,
} from '../../../src/lib/fitness/traceMinerals';

/** A BLS-shaped record: every trace mineral but selenium. */
const bls = (over: Record<string, number> = {}) => ({
	calories: 100, copper: 0.4, manganese: 4.9, iodine: 3, chromium: 2, molybdenum: 70, ...over,
});

/** A USDA-shaped record: selenium, copper and manganese, nothing else. */
const usda = (over: Record<string, number> = {}) => ({
	calories: 100, copper: 0.2, manganese: 1.2, selenium: 40, ...over,
});

describe('reportsTrace', () => {
	it('counts a stored zero as a measurement', () => {
		expect(reportsTrace({ selenium: 0 }, 'selenium')).toBe(true);
	});

	it('does not count an absent or non-numeric key', () => {
		expect(reportsTrace({}, 'selenium')).toBe(false);
		expect(reportsTrace(null, 'selenium')).toBe(false);
		expect(reportsTrace({ selenium: NaN }, 'selenium')).toBe(false);
	});
});

describe('traceTotals', () => {
	it('scales by the amount eaten', () => {
		const { totals } = traceTotals([{ amountGrams: 50, per100g: usda() }]);
		expect(totals.selenium).toBeCloseTo(20);
		expect(totals.copper).toBeCloseTo(0.1);
	});

	// The point of the module: a BLS food must not pull selenium toward zero just by
	// being eaten alongside a USDA one that reports it.
	it('sums a mineral only over the entries that report it', () => {
		const { totals } = traceTotals([
			{ amountGrams: 100, per100g: usda() },
			{ amountGrams: 100, per100g: bls() },
		]);
		expect(totals.selenium).toBeCloseTo(40);
		expect(totals.copper).toBeCloseTo(0.6);
	});

	it('leaves a mineral nothing reported absent rather than zero', () => {
		const { totals } = traceTotals([{ amountGrams: 100, per100g: bls() }]);
		expect(totals.selenium).toBeUndefined();
		expect('selenium' in totals).toBe(false);
	});

	it('reports coverage as the share of calories that measured each mineral', () => {
		const { coverage, basis } = traceTotals([
			{ amountGrams: 100, per100g: usda() },   // 100 kcal, has selenium
			{ amountGrams: 300, per100g: bls() },    // 300 kcal, does not
		]);
		expect(basis).toBe('calories');
		expect(coverage.selenium).toBeCloseTo(0.25);
		expect(coverage.copper).toBeCloseTo(1);
		expect(coverage.iodine).toBeCloseTo(0.75);
	});

	it('falls back to grams when nothing logged carries calories', () => {
		const { coverage, basis } = traceTotals([
			{ amountGrams: 100, per100g: { calories: 0, selenium: 5 } },
			{ amountGrams: 100, per100g: { calories: 0 } },
		]);
		expect(basis).toBe('grams');
		expect(coverage.selenium).toBeCloseTo(0.5);
	});

	it('treats an empty day as fully covered so it reads as no data, not a gap', () => {
		const { totals, coverage } = traceTotals([]);
		expect(totals).toEqual({});
		for (const k of TRACE_MINERAL_KEYS) expect(coverage[k]).toBe(1);
	});

	it('ignores entries with no weight', () => {
		const { totals } = traceTotals([{ amountGrams: 0, per100g: usda() }]);
		expect(totals.selenium).toBeUndefined();
	});
});

describe('traceCoverageNote', () => {
	it('says nothing when every mineral is covered', () => {
		const { coverage } = traceTotals([{ amountGrams: 100, per100g: { calories: 100, ...Object.fromEntries(TRACE_MINERAL_KEYS.map(k => [k, 1])) } }]);
		expect(traceCoverageNote(coverage, true)).toBe('');
	});

	it('quotes the weakest mineral when one is short', () => {
		const { coverage } = traceTotals([
			{ amountGrams: 100, per100g: usda() },
			{ amountGrams: 300, per100g: bls() },
		]);
		expect(traceCoverageNote(coverage, true)).toContain('25%');
	});
});

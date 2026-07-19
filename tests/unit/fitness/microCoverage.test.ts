import { describe, it, expect } from 'vitest';
import {
	groupsPresent,
	hasMicros,
	microCoverage,
	MINERAL_KEYS,
	VITAMIN_KEYS,
	AMINO_KEYS,
} from '$lib/fitness/microCoverage';

/** A BLS/USDA-shaped record: every key written, zeros meaning "measured, none". */
function full(overrides: Record<string, number> = {}) {
	const p: Record<string, number> = { calories: 120, protein: 10 };
	for (const k of [...MINERAL_KEYS, ...VITAMIN_KEYS, ...AMINO_KEYS]) p[k] = 1;
	return { ...p, ...overrides };
}

/** An OFF-shaped record: macros plus whichever keys the product declared. */
const OFF_MACROS_ONLY = { calories: 250, protein: 6, fat: 12, carbs: 30, sugars: 4 };
const OFF_WITH_SODIUM = { ...OFF_MACROS_ONLY, sodium: 400 };
const OFF_TWO_MINERALS = { ...OFF_MACROS_ONLY, calcium: 120, iron: 2 };

describe('groupsPresent', () => {
	it('reports every group for a fully written record', () => {
		expect(groupsPresent(full())).toEqual({ minerals: true, vitamins: true, aminos: true });
	});

	it('counts an explicit zero as measured data', () => {
		// Oats really do contain no B12 — a stored 0 must not read as missing.
		const zeroed = full(Object.fromEntries(VITAMIN_KEYS.map(k => [k, 0])));
		expect(groupsPresent(zeroed).vitamins).toBe(true);
	});

	it('rejects a macro-only Open Food Facts record', () => {
		expect(groupsPresent(OFF_MACROS_ONLY)).toEqual({ minerals: false, vitamins: false, aminos: false });
	});

	it('does not let sodium alone stand in for minerals', () => {
		// OFF derives sodium from salt on nearly every product.
		expect(groupsPresent(OFF_WITH_SODIUM).minerals).toBe(false);
	});

	it('still rejects a record declaring only a couple of minerals', () => {
		// The old "has any micronutrient" rule waved this through.
		expect(groupsPresent(OFF_TWO_MINERALS).minerals).toBe(false);
	});

	it('accepts a group once half its keys are present', () => {
		const half = Object.fromEntries(MINERAL_KEYS.slice(0, 3).map(k => [k, 1]));
		expect(groupsPresent({ ...OFF_MACROS_ONLY, ...half }).minerals).toBe(true);
	});

	it('handles a missing snapshot', () => {
		expect(groupsPresent(null)).toEqual({ minerals: false, vitamins: false, aminos: false });
	});
});

describe('hasMicros', () => {
	it('requires all three groups', () => {
		expect(hasMicros(full())).toBe(true);
		expect(hasMicros(full(Object.fromEntries(AMINO_KEYS.map(k => [k, undefined as any]))))).toBe(false);
		expect(hasMicros(OFF_TWO_MINERALS)).toBe(false);
	});
});

describe('microCoverage', () => {
	it('weights each group by calories, so a bulky low-energy food cannot mask a gap', () => {
		// 300 g of oats at 120 kcal/100 g = 360 kcal covered;
		// 100 g of bar at 250 kcal/100 g = 250 kcal uncovered.
		const c = microCoverage([
			{ name: 'Oats', amountGrams: 300, per100g: full() },
			{ name: 'Bar', amountGrams: 100, per100g: OFF_MACROS_ONLY },
		]);
		expect(c.basis).toBe('calories');
		expect(c.totalCalories).toBeCloseTo(610);
		expect(c.totalGrams).toBe(400);
		// by grams this would read 0.75 — by calories the gap is bigger
		expect(c.ratios.minerals).toBeCloseTo(360 / 610);
		expect(c.worst).toBeCloseTo(360 / 610);
		expect(c.missing).toEqual(['Bar']);
	});

	it('falls back to grams when nothing logged carries calories', () => {
		const c = microCoverage([
			{ name: 'Oats', amountGrams: 300, per100g: { ...full(), calories: 0 } },
			{ name: 'Bar', amountGrams: 100, per100g: { ...OFF_MACROS_ONLY, calories: 0 } },
		]);
		expect(c.basis).toBe('grams');
		expect(c.ratios.minerals).toBeCloseTo(0.75);
	});

	it('tracks groups separately — minerals can be covered while aminos are not', () => {
		const mineralsOnly = { ...OFF_MACROS_ONLY, ...Object.fromEntries(MINERAL_KEYS.map(k => [k, 1])) };
		const c = microCoverage([{ name: 'Fortified drink', amountGrams: 200, per100g: mineralsOnly }]);
		expect(c.ratios.minerals).toBe(1);
		expect(c.ratios.vitamins).toBe(0);
		expect(c.ratios.aminos).toBe(0);
		expect(c.worst).toBe(0);
	});

	it('deduplicates the names of entries missing data', () => {
		const c = microCoverage([
			{ name: 'Bar', amountGrams: 50, per100g: OFF_MACROS_ONLY },
			{ name: 'Bar', amountGrams: 50, per100g: OFF_MACROS_ONLY },
		]);
		expect(c.missing).toEqual(['Bar']);
	});

	it('ignores entries with no amount', () => {
		const c = microCoverage([
			{ name: 'Oats', amountGrams: 100, per100g: full() },
			{ name: 'Ghost', amountGrams: 0, per100g: OFF_MACROS_ONLY },
		]);
		expect(c.totalGrams).toBe(100);
		expect(c.worst).toBe(1);
		expect(c.missing).toEqual([]);
	});

	it('reports full coverage for an empty diary rather than dividing by zero', () => {
		expect(microCoverage([]).worst).toBe(1);
		expect(microCoverage(null).worst).toBe(1);
	});
});

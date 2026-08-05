import { describe, it, expect } from 'vitest';
import { MINERAL_ORDER, VITAMIN_ORDER, OTHER_ORDER, OTHER_WHEN_PRESENT } from '../../../src/lib/fitness/nutrientOrder';
import { NUTRIENT_META } from '../../../src/lib/data/dailyReferenceIntake';
import { VITAMIN_KEYS, MINERAL_KEYS } from '../../../src/lib/fitness/microCoverage';

/** The B number a key is labelled with, or null for the vitamins without one. */
function bNumber(key: string): number | null {
	const meta = NUTRIENT_META[key as keyof typeof NUTRIENT_META];
	const m = meta.label.match(/B(\d+)/);
	return m ? Number(m[1]) : null;
}

describe('nutrient display order', () => {
	it('runs the B complex in numeric order', () => {
		const numbers = VITAMIN_ORDER.map(bNumber).filter((n): n is number => n !== null);
		expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
		// Every B vitamin the app tracks is in there, not just a sorted subset.
		expect(numbers).toEqual([1, 2, 3, 5, 6, 7, 9, 12]);
	});

	it('puts the fat-soluble vitamins first, then C, then the B complex', () => {
		const fatSoluble = ['vitaminA', 'vitaminD', 'vitaminE', 'vitaminK'];
		const lastFatSoluble = Math.max(...fatSoluble.map(k => VITAMIN_ORDER.indexOf(k)));
		const c = VITAMIN_ORDER.indexOf('vitaminC');
		const firstB = Math.min(
			...VITAMIN_ORDER.filter(k => bNumber(k) !== null).map(k => VITAMIN_ORDER.indexOf(k))
		);
		expect(lastFatSoluble).toBeLessThan(c);
		expect(c).toBeLessThan(firstB);
	});

	it('keeps retinol directly under vitamin A, whose preformed share it is', () => {
		expect(VITAMIN_ORDER.indexOf('retinol')).toBe(VITAMIN_ORDER.indexOf('vitaminA') + 1);
	});

	it('names every key it orders', () => {
		for (const key of [...MINERAL_ORDER, ...VITAMIN_ORDER, ...OTHER_ORDER]) {
			expect(NUTRIENT_META[key as keyof typeof NUTRIENT_META], key).toBeDefined();
		}
	});

	it('only marks conditional rows that are actually in the other section', () => {
		for (const key of OTHER_WHEN_PRESENT) expect(OTHER_ORDER).toContain(key);
	});

	it('probes coverage in the same order it displays', () => {
		// The coverage probe deliberately covers fewer nutrients — it must still be a
		// subsequence of the display order, or the two lists have drifted apart.
		expect(VITAMIN_KEYS).toEqual(VITAMIN_ORDER.filter(k => VITAMIN_KEYS.includes(k)));
		expect(MINERAL_KEYS).toEqual(MINERAL_ORDER.filter(k => MINERAL_KEYS.includes(k)));
	});
});

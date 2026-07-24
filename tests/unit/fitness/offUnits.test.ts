import { describe, it, expect } from 'vitest';
import { offPer100gToAppUnits, OFF_UNIT_SCALE } from '../../../src/lib/fitness/offUnits';

describe('offPer100gToAppUnits', () => {
	// The bug this exists to prevent: OFF stores 12.9 mg of vitamin C as 0.0129 g,
	// and reading that straight into a food log understates it a thousandfold.
	it('scales milligram nutrients out of OFF grams', () => {
		const out = offPer100gToAppUnits({ calcium: 0.32, vitaminC: 0.0129, sodium: 0.984 });
		expect(out.calcium).toBeCloseTo(320);
		expect(out.vitaminC).toBeCloseTo(12.9);
		expect(out.sodium).toBeCloseTo(984);
	});

	it('scales microgram nutrients out of OFF grams', () => {
		const out = offPer100gToAppUnits({ vitaminA: 0.0010713, vitaminD: 0.000010725, folate: 0.0002 });
		expect(out.vitaminA).toBeCloseTo(1071.3);
		expect(out.vitaminD).toBeCloseTo(10.725);
		expect(out.folate).toBeCloseTo(200);
	});

	it('leaves energy, macros and fatty acids alone — both conventions use grams', () => {
		const out = offPer100gToAppUnits({
			calories: 546, protein: 6.3, fat: 31, carbs: 57.5, fiber: 3.4,
			saturatedFat: 10.6, omega3: 0.2, dha: 0.05,
		});
		expect(out.calories).toBe(546);
		expect(out.protein).toBe(6.3);
		expect(out.saturatedFat).toBe(10.6);
		expect(out.dha).toBe(0.05);
	});

	it('rounds away binary floating point noise', () => {
		// 0.0129 * 1000 is 12.899999999999999 unrounded, and that would be stored.
		expect(String(offPer100gToAppUnits({ vitaminC: 0.0129 }).vitaminC)).toBe('12.9');
	});

	it('drops absent and non-numeric values instead of coercing them', () => {
		const out = offPer100gToAppUnits({ calcium: NaN, iron: undefined as any, zinc: 0.001 });
		expect('calcium' in out).toBe(false);
		expect('iron' in out).toBe(false);
		expect(out.zinc).toBeCloseTo(1);
	});

	it('handles a missing record', () => {
		expect(offPer100gToAppUnits(null)).toEqual({});
		expect(offPer100gToAppUnits(undefined)).toEqual({});
	});

	// Every scaled key must be one the app actually stores, or the conversion would
	// be writing a nutrient nothing reads.
	it('scales only keys with a milligram or microgram reference unit', () => {
		for (const scale of Object.values(OFF_UNIT_SCALE)) {
			expect([1e3, 1e6]).toContain(scale);
		}
	});
});

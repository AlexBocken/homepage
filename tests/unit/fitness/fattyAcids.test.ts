import { describe, it, expect } from 'vitest';
import {
	omegaTotals, epaDha, fatSplit, carbSplit, hasFattyAcids, sumFattyAcids,
} from '../../../src/lib/fitness/fattyAcids';
import { getDRI, REFERENCE_ENERGY } from '../../../src/lib/data/dailyReferenceIntake';

describe('getDRI energy scaling', () => {
	it('keeps the reference values when no energy goal is known', () => {
		const base = getDRI('male');
		expect(getDRI('male', null)).toEqual(base);
		expect(getDRI('male', 0)).toEqual(base);
	});

	it('scales the energy-share fatty acids with intake', () => {
		const base = getDRI('male');
		const big = getDRI('male', REFERENCE_ENERGY.male * 1.5);
		expect(big.saturatedFat).toBeCloseTo(base.saturatedFat * 1.5, 1);
		expect(big.linoleicAcid).toBeCloseTo(base.linoleicAcid * 1.5, 1);
		expect(big.alphaLinolenicAcid).toBeCloseTo(base.alphaLinolenicAcid * 1.5, 1);
		expect(big.transFat).toBeCloseTo(base.transFat * 1.5, 1);
	});

	// EPA+DHA is an absolute 250 mg/day adequate intake, not a proportion of energy.
	it('leaves EPA + DHA fixed regardless of intake', () => {
		expect(getDRI('male', 3200).epaDha).toBe(getDRI('male').epaDha);
		expect(getDRI('female', 1200).epaDha).toBe(getDRI('female').epaDha);
	});

	it('leaves nutrients that are not energy shares alone', () => {
		const base = getDRI('female');
		const scaled = getDRI('female', 2400);
		expect(scaled.calcium).toBe(base.calcium);
		expect(scaled.iron).toBe(base.iron);
		expect(scaled.protein).toBe(base.protein);
	});

	it('scales each sex against its own reference energy', () => {
		// At the reference itself nothing should move.
		expect(getDRI('female', REFERENCE_ENERGY.female).saturatedFat)
			.toBeCloseTo(getDRI('female').saturatedFat, 5);
	});
});

describe('omegaTotals', () => {
	it('sums the individual acids when a source reports them', () => {
		const { omega3, omega6 } = omegaTotals({
			alphaLinolenicAcid: 1, epa: 0.2, dpa: 0.05, dha: 0.3,
			linoleicAcid: 4, gammaLinolenicAcid: 0.1, arachidonicAcid: 0.02,
		});
		expect(omega3?.value).toBeCloseTo(1.55);
		expect(omega3?.derived).toBe(true);
		expect(omega6?.value).toBeCloseTo(4.12);
		expect(omega6?.derived).toBe(true);
	});

	it('falls back to a stored total only when no acid is present', () => {
		const { omega3 } = omegaTotals({ omega3: 2.5 });
		expect(omega3).toEqual({ value: 2.5, derived: false, from: [] });
	});

	// The whole point of deriving on read: a stored total that disagrees with the
	// acids must lose, otherwise adding an acid to an importer could never fix a
	// record that already has a bad total.
	it('prefers the acids over a disagreeing stored total', () => {
		const { omega3 } = omegaTotals({ alphaLinolenicAcid: 1, dha: 0.5, omega3: 99 });
		expect(omega3?.value).toBeCloseTo(1.5);
		expect(omega3?.derived).toBe(true);
	});

	it('sums only the acids present rather than treating absent as zero', () => {
		const { omega3 } = omegaTotals({ dha: 0.4 });
		expect(omega3?.value).toBeCloseTo(0.4);
		expect(omega3?.from).toEqual(['dha']);
	});

	it('reports nothing when neither acids nor a total exist', () => {
		expect(omegaTotals({ fat: 10 }).omega3).toBeNull();
		expect(omegaTotals(null).omega6).toBeNull();
	});

	// A measured zero is data — a fish oil-free product reporting 0 g EPA should
	// derive a total, not be treated as unreported.
	it('treats a measured zero as present', () => {
		const { omega3 } = omegaTotals({ epa: 0 });
		expect(omega3).toEqual({ value: 0, derived: true, from: ['epa'] });
	});
});

describe('epaDha', () => {
	it('sums the marine pair the reference intake is set against', () => {
		expect(epaDha({ epa: 0.18, dha: 0.32 })?.value).toBeCloseTo(0.5);
	});

	it('ignores the plant-derived acids', () => {
		expect(epaDha({ alphaLinolenicAcid: 5 })).toBeNull();
	});
});

describe('fatSplit', () => {
	it('reports the remainder total fat does not account for', () => {
		const s = fatSplit({ fat: 100, saturatedFat: 14, monounsaturatedFat: 73, polyunsaturatedFat: 11 });
		expect(s.unaccounted).toBeCloseTo(2);
		expect(s.hasBreakdown).toBe(true);
	});

	// Rounding across sources routinely makes the parts exceed the whole by a
	// tenth of a gram; a negative slice would render as an inverted bar.
	it('never reports a negative remainder', () => {
		expect(fatSplit({ fat: 10, saturatedFat: 6, monounsaturatedFat: 5 }).unaccounted).toBe(0);
	});

	it('flags a record carrying no subtype at all', () => {
		const s = fatSplit({ fat: 12 });
		expect(s.hasBreakdown).toBe(false);
		expect(s.unaccounted).toBeCloseTo(12);
	});
});

describe('carbSplit', () => {
	it('leaves starch as the remainder after sugars', () => {
		const s = carbSplit({ carbs: 70, sugars: 4, fiber: 10 });
		expect(s.other).toBeCloseTo(66);
		expect(s.hasBreakdown).toBe(true);
	});

	it('flags a record with neither sugars nor fibre', () => {
		expect(carbSplit({ carbs: 20 }).hasBreakdown).toBe(false);
	});
});

describe('hasFattyAcids', () => {
	it('ignores total fat, which every source publishes', () => {
		expect(hasFattyAcids({ fat: 10, calories: 90 })).toBe(false);
		expect(hasFattyAcids({ fat: 10, saturatedFat: 3 })).toBe(true);
	});
});

describe('sumFattyAcids', () => {
	it('scales by the eaten amount and tracks what each key was measured across', () => {
		const { totals, reportedGrams, totalGrams } = sumFattyAcids([
			{ amountGrams: 200, per100g: { fat: 10, saturatedFat: 2, dha: 0.5 } },
			{ amountGrams: 100, per100g: { fat: 20, saturatedFat: 8 } },
		]);
		expect(totals.saturatedFat).toBeCloseTo(12);
		expect(totals.dha).toBeCloseTo(1);
		expect(totalGrams).toBe(300);
		// DHA came from one 200 g entry, saturated fat from both — the denominator
		// the caller needs to say how much of the day each figure represents.
		expect(reportedGrams.dha).toBe(200);
		expect(reportedGrams.saturatedFat).toBe(300);
	});

	it('skips entries with no weight', () => {
		const { totalGrams } = sumFattyAcids([{ amountGrams: 0, per100g: { saturatedFat: 5 } }]);
		expect(totalGrams).toBe(0);
	});
});

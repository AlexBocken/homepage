import { describe, it, expect } from 'vitest';
import { trendValueOn, timeDecayedTrend } from '../../../src/lib/fitness/trend';
import { macroGoalGrams } from '../../../src/lib/fitness/macroGoals';

/** A weight that climbs 80 → 84 kg over four weeks, one reading a week. */
const weights = [
	{ date: '2026-07-01', value: 80 },
	{ date: '2026-07-08', value: 81 },
	{ date: '2026-07-15', value: 82 },
	{ date: '2026-07-22', value: 83 },
	{ date: '2026-07-29', value: 84 },
];

describe('trendValueOn', () => {
	it('is null before anything was ever weighed', () => {
		expect(trendValueOn(weights, '2026-06-30')).toBeNull();
		expect(trendValueOn([], '2026-07-15')).toBeNull();
	});

	it('is the reading itself when there is only one', () => {
		expect(trendValueOn(weights, '2026-07-01')).toBe(80);
	});

	// The point of the whole exercise: opening a past day must not see the future.
	it('ignores everything logged after the day asked about', () => {
		const mid = trendValueOn(weights, '2026-07-15');
		const later = trendValueOn(weights, '2026-07-29');
		expect(mid).not.toBeNull();
		expect(later).not.toBeNull();
		expect(mid!).toBeLessThan(later!);

		// Identical to running the trend over only the readings up to that date.
		const upTo = weights.filter((w) => w.date <= '2026-07-15');
		const { trend } = timeDecayedTrend(
			upTo.map((w) => w.value),
			upTo.map((w) => w.date)
		);
		expect(mid).toBeCloseTo(trend[trend.length - 1]);
	});

	it('smooths rather than echoing the last reading', () => {
		// A single 6 kg water spike must barely move the target. The trend lags the
		// raw series by design, so the test is how much of the jump it absorbs, not
		// where it sits relative to any one reading.
		const baseline = trendValueOn(weights, '2026-07-29')!;
		const spiked = trendValueOn([...weights, { date: '2026-07-30', value: 90 }], '2026-07-30')!;

		expect(spiked).toBeGreaterThan(baseline);
		// Less than a fifth of a 6 kg spike reaches the trend in one day.
		expect(spiked - baseline).toBeLessThan(6 * 0.2);
	});

	it('does not care what order the points arrive in', () => {
		const shuffled = [weights[3], weights[0], weights[4], weights[1], weights[2]];
		expect(trendValueOn(shuffled, '2026-07-29')).toBeCloseTo(trendValueOn(weights, '2026-07-29')!);
	});

	it('holds the last known trend for a day with no reading of its own', () => {
		// Nothing logged on the 17th; the trend is still whatever it was on the 15th.
		expect(trendValueOn(weights, '2026-07-17')).toBeCloseTo(trendValueOn(weights, '2026-07-15')!);
	});
});

describe('per-kg protein goal against a past day', () => {
	const goal = {
		calorieGoal: 2500,
		proteinMode: 'per_kg' as const,
		proteinTarget: 2,
		fatPercent: 30,
		carbPercent: 45,
	};

	it('uses the weight from that day, not the latest one', () => {
		const then = macroGoalGrams({ ...goal, weightKg: trendValueOn(weights, '2026-07-01') });
		const now = macroGoalGrams({ ...goal, weightKg: trendValueOn(weights, '2026-07-29') });

		expect(then.protein).toBeCloseTo(160); // 2 g/kg × 80 kg
		expect(now.protein).not.toBeCloseTo(160);
		expect(now.protein!).toBeGreaterThan(then.protein!);
	});

	it('leaves a fixed goal alone whatever the weight did', () => {
		const fixed = { ...goal, proteinMode: 'fixed' as const, proteinTarget: 150 };
		expect(macroGoalGrams({ ...fixed, weightKg: 80 }).protein).toBe(150);
		expect(macroGoalGrams({ ...fixed, weightKg: 84 }).protein).toBe(150);
	});
});

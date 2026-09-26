import { describe, it, expect } from 'vitest';
import {
	buildTrendWeightLookup,
	tdeeForDay,
	canEstimateTdee,
	dailyTotals
} from '$lib/fitness/bodyTrend';
import { computeBmr, activityMultiplier } from '$lib/fitness/energy';

const d = (s: string) => new Date(s + 'T00:00:00.000Z');

describe('buildTrendWeightLookup', () => {
	it('is empty with no weigh-ins', () => {
		const t = buildTrendWeightLookup([]);
		expect(t.byDate.size).toBe(0);
		expect(t.latest).toBeNull();
		expect(t.on('2026-01-01')).toBeNull();
	});

	it('uses a window of 2 for one to five weigh-ins, growing at the start', () => {
		const t = buildTrendWeightLookup([
			{ date: d('2026-01-01'), weight: 80 },
			{ date: d('2026-01-03'), weight: 81 },
			{ date: d('2026-01-04'), weight: 79.3 }
		]);
		expect([...t.byDate]).toEqual([
			['2026-01-01', 80],
			['2026-01-03', 80.5],
			['2026-01-04', 80.15]
		]);
		expect(t.latest).toBe(80.15);
	});

	it('caps the window at 7 and rounds to 0.01', () => {
		const ms = Array.from({ length: 20 }, (_, i) => ({
			date: d(`2026-02-${String(i + 1).padStart(2, '0')}`),
			weight: 70 + i / 3
		}));
		const t = buildTrendWeightLookup(ms);
		// last value: mean of weights 13..19 → 70 + 16/3 = 75.333… → 75.33
		expect(t.latest).toBe(75.33);
		expect(t.byDate.get('2026-02-01')).toBe(70);
		// index 1: window min(7, 2) = 2 → (70 + 70.333)/2 = 70.1666 → 70.17
		expect(t.byDate.get('2026-02-02')).toBe(70.17);
	});

	it('window is floor(n/2) between the clamps', () => {
		// 8 weigh-ins → window 4
		const ms = [1, 2, 3, 4, 5, 6, 7, 8].map((w, i) => ({ date: d(`2026-03-0${i + 1}`), weight: w }));
		const t = buildTrendWeightLookup(ms);
		expect(t.byDate.get('2026-03-08')).toBe(6.5); // (5+6+7+8)/4
		expect(t.byDate.get('2026-03-03')).toBe(2); // (1+2+3)/3
	});

	it('falls back to the most recent prior weigh-in, and null before the first', () => {
		const t = buildTrendWeightLookup([
			{ date: d('2026-01-05'), weight: 80 },
			{ date: d('2026-01-10'), weight: 82 }
		]);
		expect(t.on('2026-01-04')).toBeNull();
		expect(t.on('2026-01-05')).toBe(80);
		expect(t.on('2026-01-07')).toBe(80);
		expect(t.on('2026-01-10')).toBe(81);
		expect(t.on('2026-02-01')).toBe(81);
	});

	it('same-day weigh-ins share a key, the later one wins', () => {
		const t = buildTrendWeightLookup([
			{ date: '2026-01-01T07:00:00Z', weight: 80 },
			{ date: '2026-01-01T20:00:00Z', weight: 82 }
		]);
		expect([...t.byDate]).toEqual([['2026-01-01', 81]]);
		expect(t.latest).toBe(81);
	});
});

describe('tdeeForDay', () => {
	const goal = { heightCm: 180, birthYear: 1990, sex: 'male' as const, activityLevel: 'moderate' };

	it('is BMR × NEAT multiplier with age from the year', () => {
		expect(tdeeForDay(80, goal, 2026)).toBe(computeBmr(80, 180, 36, 'male') * activityMultiplier('moderate'));
		expect(tdeeForDay(80, goal, 2026)).toBe((800 + 1125 - 180 + 5) * 1.4);
	});

	it('defaults sex to male and activity to light', () => {
		expect(tdeeForDay(60, { heightCm: 170, birthYear: 2000 }, 2026)).toBe(computeBmr(60, 170, 26, 'male') * 1.3);
		expect(tdeeForDay(60, { heightCm: 170, birthYear: 2000, sex: 'female' }, 2026)).toBe(
			computeBmr(60, 170, 26, 'female') * 1.3
		);
	});

	it('is null without height, birth year or weight', () => {
		expect(tdeeForDay(80, { birthYear: 1990 }, 2026)).toBeNull();
		expect(tdeeForDay(80, { heightCm: 180 }, 2026)).toBeNull();
		expect(tdeeForDay(null, goal, 2026)).toBeNull();
		expect(tdeeForDay(0, goal, 2026)).toBeNull();
		expect(tdeeForDay(80, null, 2026)).toBeNull();
		expect(canEstimateTdee(goal)).toBe(true);
		expect(canEstimateTdee(undefined)).toBe(false);
	});
});

describe('dailyTotals', () => {
	it('sums per-100 g fields scaled by grams, per day, in first-seen order', () => {
		const totals = dailyTotals(
			[
				{ date: d('2026-01-02'), amountGrams: 150, per100g: { calories: 200, protein: 10 } },
				{ date: d('2026-01-01'), amountGrams: 50, per100g: { calories: 100, protein: null } },
				{ date: d('2026-01-02'), amountGrams: null, per100g: { calories: 999 } },
				{ date: d('2026-01-02'), amountGrams: 100, per100g: null },
				{ date: d('2026-01-01'), amountGrams: 30, per100g: { calories: 33.3, protein: 3.3 } }
			],
			['calories', 'protein'] as const
		);
		expect([...totals.keys()]).toEqual(['2026-01-02', '2026-01-01']);
		expect(totals.get('2026-01-02')).toEqual({ calories: 300, protein: 15 });
		// same float order as the old running sum: 0 + 100*0.5 + 33.3*0.3
		expect(totals.get('2026-01-01')!.calories).toBe(0 + 100 * 0.5 + 33.3 * 0.3);
		expect(totals.get('2026-01-01')!.protein).toBe(0 + 0 * 0.5 + 3.3 * 0.3);
	});
});

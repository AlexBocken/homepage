import { describe, it, expect } from 'vitest';
import {
	timeDecayedTrend, sparseTrend, TREND_TAU_DAYS, TREND_TAU_DAYS_BODY_PART,
} from '../../../src/lib/fitness/trend';

/** Consecutive daily dates from a fixed start, so tests never depend on today. */
function days(n: number): string[] {
	const out: string[] = [];
	for (let i = 0; i < n; i++) {
		out.push(new Date(Date.UTC(2026, 0, 1 + i)).toISOString());
	}
	return out;
}

describe('timeDecayedTrend', () => {
	it('starts on the first reading with no band', () => {
		const { trend, upper, lower } = timeDecayedTrend([80, 81], days(2));
		expect(trend[0]).toBe(80);
		expect(upper[0]).toBe(80);
		expect(lower[0]).toBe(80);
	});

	it('lags a step change rather than jumping to it', () => {
		const { trend } = timeDecayedTrend([80, 80, 80, 90], days(4));
		expect(trend[3]).toBeGreaterThan(80);
		expect(trend[3]).toBeLessThan(90);
	});

	it('tracks a constant series exactly and keeps the band closed', () => {
		const { trend, upper, lower } = timeDecayedTrend([70, 70, 70, 70], days(4));
		for (let i = 0; i < 4; i++) {
			expect(trend[i]).toBeCloseTo(70);
			expect(upper[i] - lower[i]).toBeCloseTo(0);
		}
	});

	// The whole point of decaying by time rather than by position: a reading after a
	// long gap should move the trend further than one taken the next day.
	it('weights a reading after a gap more heavily than a daily one', () => {
		const daily = timeDecayedTrend([80, 90], days(2));
		const gapped = timeDecayedTrend([80, 90], [
			new Date(Date.UTC(2026, 0, 1)).toISOString(),
			new Date(Date.UTC(2026, 1, 20)).toISOString(),
		]);
		expect(gapped.trend[1]).toBeGreaterThan(daily.trend[1]);
	});

	it('opens a band once readings disagree', () => {
		const { upper, lower } = timeDecayedTrend([80, 84, 79, 83], days(4));
		expect(upper[3] - lower[3]).toBeGreaterThan(0);
	});

	it('smooths harder with a longer memory', () => {
		const short = timeDecayedTrend([80, 80, 80, 90], days(4), TREND_TAU_DAYS);
		const long = timeDecayedTrend([80, 80, 80, 90], days(4), TREND_TAU_DAYS_BODY_PART);
		expect(long.trend[3]).toBeLessThan(short.trend[3]);
	});
});

describe('sparseTrend', () => {
	it('aligns results back to the original axis, leaving gaps null', () => {
		const d = days(4);
		const out = sparseTrend([30, null, 32, 33], d, TREND_TAU_DAYS_BODY_PART)!;
		expect(out.trend).toHaveLength(4);
		expect(out.trend[1]).toBeNull();
		expect(out.upper[1]).toBeNull();
		expect(out.lower[1]).toBeNull();
		expect(out.trend[0]).toBe(30);
		expect(typeof out.trend[2]).toBe('number');
	});

	// A gap must not shift the series: dropping the null and smoothing the rest has
	// to give the same numbers at the positions that do have readings.
	it('ignores gaps rather than treating them as values', () => {
		const d = days(3);
		const withGap = sparseTrend([30, null, 34], d, TREND_TAU_DAYS_BODY_PART)!;
		const dense = sparseTrend([30, 34], [d[0], d[2]], TREND_TAU_DAYS_BODY_PART)!;
		expect(withGap.trend[2]).toBe(dense.trend[1]);
	});

	it('returns null below two readings, where a band would be meaningless', () => {
		expect(sparseTrend([], [], TREND_TAU_DAYS_BODY_PART)).toBeNull();
		expect(sparseTrend([42], days(1), TREND_TAU_DAYS_BODY_PART)).toBeNull();
		expect(sparseTrend([null, 42, null], days(3), TREND_TAU_DAYS_BODY_PART)).toBeNull();
	});

	it('skips undefined and NaN alongside null', () => {
		const out = sparseTrend([30, undefined, NaN, 33], days(4), TREND_TAU_DAYS_BODY_PART)!;
		expect(out.trend[1]).toBeNull();
		expect(out.trend[2]).toBeNull();
		expect(typeof out.trend[3]).toBe('number');
	});

	it('rounds to two decimals so chart tooltips stay readable', () => {
		const out = sparseTrend([30, 33.333333, 31.777777], days(3), TREND_TAU_DAYS_BODY_PART)!;
		for (const v of out.trend) {
			if (v !== null) expect(v).toBe(Math.round(v * 100) / 100);
		}
	});

	it('keeps the band ordered around the trend', () => {
		const out = sparseTrend([30, 34, 29, 33, 31], days(5), TREND_TAU_DAYS_BODY_PART)!;
		for (let i = 0; i < 5; i++) {
			const t = out.trend[i], u = out.upper[i], l = out.lower[i];
			if (t === null || u === null || l === null) continue;
			expect(u).toBeGreaterThanOrEqual(t);
			expect(l).toBeLessThanOrEqual(t);
		}
	});
});

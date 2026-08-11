import { describe, it, expect } from 'vitest';
import { forecastGoal, MAX_HORIZON_DAYS } from '../../../src/lib/fitness/goalForecast';
import { linearFit } from '../../../src/lib/fitness/trend';

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1);

/** Daily readings from a fixed start, so nothing depends on today. */
function series(values: number[], stepDays = 1) {
	return values.map((value, i) => ({ date: new Date(START + i * stepDays * DAY).toISOString(), value }));
}

/** A clean linear ramp: `n` daily readings from `from`, changing by `perDay`. */
function ramp(from: number, perDay: number, n: number) {
	return series(Array.from({ length: n }, (_, i) => from + perDay * i));
}

describe('linearFit', () => {
	it('recovers the slope of a clean ramp', () => {
		const pts = ramp(80, -0.05, 60); // −0.35 kg/week
		const fit = linearFit(
			pts.map((p) => p.value),
			pts.map((p) => p.date)
		)!;
		expect(fit.slope).toBeCloseTo(-0.05, 6);
		// The level is the fit at the LAST reading, so it lands on the last value —
		// this is the lag the EMA would have introduced and this fit must not.
		expect(fit.level).toBeCloseTo(80 - 0.05 * 59, 6);
		expect(fit.seSlope).toBeLessThan(0.001);
		// Only the last 30 days are in it, however long the history runs.
		expect(fit.n).toBe(31);
	});

	it('is undefined below two readings and for a single instant', () => {
		expect(linearFit([80], [new Date(START).toISOString()])).toBeNull();
		const sameDay = [new Date(START).toISOString(), new Date(START).toISOString()];
		expect(linearFit([80, 81], sameDay)).toBeNull();
	});

	it('widens the slope error when the readings scatter', () => {
		const clean = ramp(80, -0.05, 40);
		const noisy = clean.map((p, i) => ({ ...p, value: p.value + (i % 2 ? 1.2 : -1.2) }));
		const a = linearFit(clean.map((p) => p.value), clean.map((p) => p.date))!;
		const b = linearFit(noisy.map((p) => p.value), noisy.map((p) => p.date))!;
		expect(b.seSlope).toBeGreaterThan(a.seSlope);
	});

	it('ignores readings older than the window', () => {
		// Flat for 8 weeks, then losing exactly 0.1/day for the last 30 days. The
		// window holds only the new regime, so the fit must report it outright —
		// no compromise with the flat stretch that a decayed fit would carry in.
		const flat = Array.from({ length: 56 }, () => 80);
		const dropping = Array.from({ length: 30 }, (_, i) => 80 - 0.1 * (i + 1));
		const pts = series([...flat, ...dropping]);
		const fit = linearFit(pts.map((p) => p.value), pts.map((p) => p.date))!;
		expect(fit.slope).toBeCloseTo(-0.1, 6);
		// 31, not 30: the window is inclusive at both ends, so the last reading of
		// the flat stretch sits exactly on the boundary (and exactly on the line).
		expect(fit.n).toBe(31);
		// A wider window necessarily sees the flat stretch and reads shallower.
		const wide = linearFit(pts.map((p) => p.value), pts.map((p) => p.date), 90)!;
		expect(wide.slope).toBeGreaterThan(fit.slope);
	});
});

describe('forecastGoal', () => {
	it('refuses to answer without enough history', () => {
		const short = ramp(80, -0.05, 3);
		const r = forecastGoal(short, { goal: 75 });
		expect(r.forecast.status).toBe('insufficient');
		expect(r.fit).toBeNull();
	});

	it('refuses when readings are plentiful but span too little time', () => {
		// Ten readings inside a week: enough points, nowhere near enough span.
		const pts = Array.from({ length: 10 }, (_, i) => ({
			date: new Date(START + i * 0.6 * DAY).toISOString(),
			value: 80 - i * 0.05
		}));
		expect(forecastGoal(pts, { goal: 75 }).forecast.status).toBe('insufficient');
	});

	it('dates the arrival of a steady loss', () => {
		const pts = ramp(80, -0.05, 60); // ends at 77.05, still falling
		const r = forecastGoal(pts, { goal: 75 });
		expect(r.forecast.status).toBe('eta');
		if (r.forecast.status !== 'eta') return;
		// (75 − 77.05) / −0.05 = 41 days after the last reading.
		expect(r.forecast.days).toBeCloseTo(41, 0);
		expect(r.forecast.etaMs).toBeCloseTo(r.forecast.fromMs + 41 * DAY, -6);
		expect(r.forecast.ratePerWeek).toBeCloseTo(-0.35, 3);
	});

	it('brackets the arrival, earliest before latest', () => {
		const pts = ramp(80, -0.05, 60).map((p, i) => ({ ...p, value: p.value + (i % 3 === 0 ? 0.3 : -0.15) }));
		const r = forecastGoal(pts, { goal: 75 });
		expect(r.forecast.status).toBe('eta');
		if (r.forecast.status !== 'eta') return;
		expect(r.forecast.earliestMs).toBeLessThan(r.forecast.etaMs);
		if (r.forecast.latestMs != null) expect(r.forecast.latestMs).toBeGreaterThan(r.forecast.etaMs);
	});

	it('calls noise flat rather than naming a date', () => {
		// Alternating readings around one value: a slope smaller than its own error.
		const pts = series(Array.from({ length: 40 }, (_, i) => 80 + (i % 2 ? 0.6 : -0.6)));
		expect(forecastGoal(pts, { goal: 75 }).forecast.status).toBe('flat');
	});

	it('says so when the trend runs away from the goal', () => {
		const pts = ramp(80, 0.05, 60); // gaining, goal is below
		expect(forecastGoal(pts, { goal: 75 }).forecast.status).toBe('wrong-way');
	});

	it('reports a goal crossed during the window as reached, not as wrong-way', () => {
		// Falls from 80 through 78 down to 77: the goal is behind us, and the rate
		// still points past it.
		const pts = ramp(80, -0.05, 60);
		expect(forecastGoal(pts, { goal: 78 }).forecast.status).toBe('reached');
	});

	it('declines to date anything beyond the horizon', () => {
		const pts = ramp(80, -0.002, 60); // ~1.5 g/day, goal 5 kg away
		const r = forecastGoal(pts, { goal: 75 });
		expect(['far', 'flat']).toContain(r.forecast.status);
		if (r.forecast.status === 'eta') expect(r.forecast.days).toBeLessThanOrEqual(MAX_HORIZON_DAYS);
	});

	describe('with a target date', () => {
		const pts = ramp(80, -0.05, 60); // ends 77.05, −0.35 kg/week, ETA +41 days
		const lastMs = START + 59 * DAY;

		it('states the rate the deadline demands', () => {
			const r = forecastGoal(pts, { goal: 75, targetDate: new Date(lastMs + 70 * DAY).toISOString() });
			expect(r.pacing).not.toBeNull();
			// 2.05 kg over 70 days = −0.205 kg/week.
			expect(r.pacing!.requiredRatePerWeek).toBeCloseTo(-0.205, 3);
			// Arriving on day 41 of 70 is 29 days early.
			expect(r.pacing!.deltaDays).toBeCloseTo(-29, 0);
			expect(r.pacing!.overdue).toBe(false);
		});

		it('shows the shortfall when the deadline is tighter than the trend', () => {
			const r = forecastGoal(pts, { goal: 75, targetDate: new Date(lastMs + 20 * DAY).toISOString() });
			expect(r.pacing!.deltaDays).toBeGreaterThan(0); // late
			// Needs more than twice the current pace.
			expect(Math.abs(r.pacing!.requiredRatePerWeek)).toBeGreaterThan(Math.abs(r.forecast.status === 'eta' ? r.forecast.ratePerWeek : 0));
		});

		it('marks a passed deadline overdue and stops quoting a required rate', () => {
			const r = forecastGoal(pts, { goal: 75, targetDate: new Date(lastMs - 5 * DAY).toISOString() });
			expect(r.pacing!.overdue).toBe(true);
			expect(r.pacing!.requiredRatePerWeek).toBe(0);
		});

		it('carries no pacing when no date is set', () => {
			expect(forecastGoal(pts, { goal: 75 }).pacing).toBeNull();
		});
	});
});

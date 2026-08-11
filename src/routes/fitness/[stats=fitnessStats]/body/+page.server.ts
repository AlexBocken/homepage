import type { PageServerLoad } from './$types';
import { timeDecayedTrend, linearFit } from '$lib/fitness/trend';
import { forecastGoal, MIN_POINTS, MIN_SPAN_DAYS, type GoalReport } from '$lib/fitness/goalForecast';

interface Point { date: string; value: number; }

/** Build a chart-ready series (raw + time-decayed trend ± 1σ) over the full
 *  history. Mirrors the dashboard overview's shape but without the 30-point
 *  display cap, so the detail view can pan/zoom across everything. */
function buildSeries(points: Point[]) {
	const dates = points.map((p) => new Date(p.date).toISOString());
	const data = points.map((p) => p.value);
	const round = (v: number) => Math.round(v * 100) / 100;
	const trend = timeDecayedTrend(data, dates);
	return {
		dates,
		data: data.map(round),
		sma: trend.trend.map(round),
		upper: trend.upper.map(round),
		lower: trend.lower.map(round)
	};
}

/**
 * The straight line through the last month of readings, whether or not anything
 * is being aimed at — "where is this heading" is a fair question with no goal in
 * sight. Held to the same minimum evidence a forecast needs, so a line is never
 * drawn through two readings a fortnight apart.
 */
function fit(points: Point[]) {
	const f = points.length ? linearFit(points.map((p) => p.value), points.map((p) => p.date)) : null;
	return f && f.n >= MIN_POINTS && f.spanDays >= MIN_SPAN_DAYS ? f : null;
}

/** Forecast a series against a target, or nothing when no target is set. */
function forecast(points: Point[], goal: number | null, targetDate: string | null): GoalReport | null {
	if (goal == null || !points.length) return null;
	return forecastGoal(points, { goal, targetDate });
}

export const load: PageServerLoad = async ({ fetch }) => {
	const [res, goalRes] = await Promise.all([
		fetch('/api/fitness/measurements?limit=2000'),
		fetch('/api/fitness/goal')
	]);
	const list = res.ok ? await res.json() : { measurements: [] };
	const goals = goalRes.ok ? await goalRes.json() : {};
	// API returns newest-first; chart wants chronological order.
	const measurements = (list.measurements ?? []).slice().reverse();

	const weightPoints: Point[] = measurements
		.filter((m: any) => m.weight != null)
		.map((m: any) => ({ date: m.date, value: m.weight }));
	const bfPoints: Point[] = measurements
		.filter((m: any) => m.bodyFatPercent != null)
		.map((m: any) => ({ date: m.date, value: m.bodyFatPercent }));
	// Fat mass needs a weight from the same reading — a scale reports both at
	// once, so entries missing one are simply skipped rather than paired with a
	// stale weight.
	const bfMassPoints: Point[] = measurements
		.filter((m: any) => m.bodyFatPercent != null && m.weight != null)
		.map((m: any) => ({ date: m.date, value: (m.weight * m.bodyFatPercent) / 100 }));

	const weightChart = buildSeries(weightPoints);

	// Body fat is plotted as Δ rather than as a noisy absolute percentage, but the
	// point it counts from depends on the window the reader has zoomed to, so the
	// subtraction happens on the client. Here the series stay absolute (percent, and
	// fat mass in kg).
	const bfChart = buildSeries(bfPoints);
	const bfMassChart = buildSeries(bfMassPoints);

	// The arrival forecast runs on the raw readings, not on the plotted series:
	// the chart's body-fat curve is a Δ against whatever window is on screen, and
	// a goal is an absolute number.
	const targetDate = goals.targetDate ?? null;
	const targets = {
		weightKg: goals.targetWeightKg ?? null,
		bodyFatPercent: goals.targetBodyFatPercent ?? null,
		fatMassKg: goals.targetFatMassKg ?? null,
		date: targetDate
	};

	return {
		weightChart,
		bfChart,
		bfMassChart,
		targets,
		fits: {
			weight: fit(weightPoints),
			bodyFat: fit(bfPoints),
			fatMass: fit(bfMassPoints)
		},
		forecasts: {
			weight: forecast(weightPoints, targets.weightKg, targetDate),
			bodyFat: forecast(bfPoints, targets.bodyFatPercent, targetDate),
			fatMass: forecast(bfMassPoints, targets.fatMassKg, targetDate)
		}
	};
};

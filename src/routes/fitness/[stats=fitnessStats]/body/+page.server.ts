import type { PageServerLoad } from './$types';
import { timeDecayedTrend } from '$lib/fitness/trend';

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

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/fitness/measurements?limit=2000');
	const list = res.ok ? await res.json() : { measurements: [] };
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

	return { weightChart, bfChart, bfMassChart };
};

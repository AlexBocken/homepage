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

	// Body fat is plotted as Δ from the first recorded point — same convention as
	// the dashboard card, where relative change reads more clearly than noisy
	// absolute percentages. Fat mass gets the same treatment, in kg.
	type DeltaSeries = ReturnType<typeof buildSeries> & { baseline: number | null };
	const emptySeries = (): DeltaSeries => ({
		dates: [], data: [], sma: [], upper: [], lower: [], baseline: null
	});
	function buildDeltaSeries(points: Point[]): DeltaSeries {
		if (points.length === 0) return emptySeries();
		const built = buildSeries(points);
		const baseline = points[0].value;
		const round = (v: number) => Math.round(v * 100) / 100;
		return {
			dates: built.dates,
			data: built.data.map((v) => round(v - baseline)),
			sma: built.sma.map((v) => round(v - baseline)),
			upper: built.upper.map((v) => round(v - baseline)),
			lower: built.lower.map((v) => round(v - baseline)),
			baseline: round(baseline)
		};
	}

	const bfChart = buildDeltaSeries(bfPoints);
	const bfMassChart = buildDeltaSeries(bfMassPoints);

	return { weightChart, bfChart, bfMassChart };
};

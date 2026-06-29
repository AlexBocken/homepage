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

	const weightChart = buildSeries(weightPoints);

	// Body fat is plotted as Δ from the first recorded point — same convention as
	// the dashboard card, where relative change reads more clearly than noisy
	// absolute percentages.
	let bfChart: ReturnType<typeof buildSeries> & { baseline: number | null } = {
		dates: [], data: [], sma: [], upper: [], lower: [], baseline: null
	};
	if (bfPoints.length > 0) {
		const built = buildSeries(bfPoints);
		const baseline = bfPoints[0].value;
		const round = (v: number) => Math.round(v * 100) / 100;
		bfChart = {
			dates: built.dates,
			data: built.data.map((v) => round(v - baseline)),
			sma: built.sma.map((v) => round(v - baseline)),
			upper: built.upper.map((v) => round(v - baseline)),
			lower: built.lower.map((v) => round(v - baseline)),
			baseline: round(baseline)
		};
	}

	return { weightChart, bfChart };
};

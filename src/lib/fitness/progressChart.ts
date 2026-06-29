// Shared builder for "metric over time" charts with the same date-aware EMA
// trend + ±1σ band the weight / strength charts use. Used by the segment detail
// page (pace per effort) and the best-effort distance page (pace/speed per run).
//
// Keeping this in one place means the band styling, point ordering and
// chronological sort stay identical across every fitness progress chart.

import { timeDecayedTrend, TREND_TAU_DAYS_PACE } from './trend';

export interface TrendChartPoint {
	date: string | Date;
	value: number;
}

export interface TrendChartOptions {
	/** Series label for the raw line (e.g. localized "Pace"). */
	label: string;
	/** Line / band colour (resolved per theme by the caller). */
	color: string;
	/** EMA time constant in days; defaults to the pace memory. */
	tauDays?: number;
	/** Value rounding before plotting (default: 2 decimals). */
	round?: (v: number) => number;
	/** Locale for the x-axis date labels. */
	locale?: string;
}

/** Shape consumed by `FitnessChart` (`{ labels, dates, datasets }`). */
export interface TrendChartData {
	labels: string[];
	dates: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	datasets: any[];
}

/**
 * Build `FitnessChart` data for a metric over time. Points are sorted
 * chronologically; with ≥3 points an EMA trend line and shaded ±1σ band are
 * overlaid (fewer points can't form a meaningful trend, so just the raw line is
 * returned). Returns `null` when there's nothing to plot.
 */
export function buildTrendChart(
	points: TrendChartPoint[],
	opts: TrendChartOptions
): TrendChartData | null {
	if (!points.length) return null;
	const { label, color, tauDays = TREND_TAU_DAYS_PACE, locale } = opts;
	const round = opts.round ?? ((v: number) => Math.round(v * 100) / 100);

	const sorted = [...points].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);
	const values = sorted.map((p) => p.value);
	const dates = sorted.map((p) => new Date(p.date).toISOString());
	const labels = sorted.map((p) =>
		new Date(p.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
	);
	const raw = { label, data: values.map(round), borderColor: color };

	if (values.length < 3) {
		return { labels, dates, datasets: [{ ...raw, borderWidth: 2, pointRadius: 3, order: 0 }] };
	}

	const { trend, upper, lower } = timeDecayedTrend(values, dates, tauDays);
	return {
		labels,
		dates,
		datasets: [
			{ label: '± 1σ', data: upper.map(round), borderColor: 'transparent', backgroundColor: `${color}26`, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
			{ label: '± 1σ (lower)', data: lower.map(round), borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
			{ label: 'Trend', data: trend.map(round), borderColor: color, pointRadius: 0, borderWidth: 2, tension: 0.3, order: 1 },
			{ ...raw, borderWidth: 1, pointRadius: 3, order: 0 }
		]
	};
}

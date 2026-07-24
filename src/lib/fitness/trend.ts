// Time-decayed trend (EMA) for irregularly-spaced measurements like weigh-ins.
//
// A plain N-point moving average is blind to dates: after a gap (e.g. daily for
// 10 days, a 10-day break, then resume) the average at the first new point still
// drags in pre-gap readings. Here each step's weight decays with the *time* since
// the previous reading — α = 1 − exp(−Δt/τ) — so old points and gaps fade out
// automatically (a 20-day-old reading counts ~exp(−20/14) ≈ 24% at τ=14, and far
// less once newer points pile on). No hard cutoff, always defined.
//
// The band is an exponentially-weighted variance (RiskMetrics-style), so it
// widens after a gap (the first post-break reading carries real uncertainty) and
// tightens as fresh readings accumulate.

// Body weight and body fat: weighed often, sometimes daily, and both move faster
// than the smoothing used to admit. At τ=14 the trend lagged real change by about a
// fortnight, so a genuine shift only showed up once it was half over. A ~10-day
// memory still rides over day-to-day water and gut-content swings — the noise these
// readings actually carry — while following a real trend closely enough to act on.
export const TREND_TAU_DAYS = 10;
// Strength metrics (1RM / max weight / volume): trained only ~1-2×/week and move
// slowly, so they want far heavier smoothing — a ~6-week memory.
export const TREND_TAU_DAYS_STRENGTH = 42;
// Pace on a segment / best-effort distance: efforts land sparsely (a given route
// or distance is run maybe weekly) and fitness drifts slowly, so a ~1-month
// memory rides through day-to-day noise without erasing real progress.
export const TREND_TAU_DAYS_PACE = 30;
// Body-part circumferences: taken every week or two at most, and a tape measure
// carries more reading-to-reading noise than a scale — placement, tension and time
// of day all move it a few millimetres. Still slower-moving than body weight, so the
// memory stays longer, but a full month buried change that was actually visible in
// the readings; three weeks keeps the noise rejection without the lag.
export const TREND_TAU_DAYS_BODY_PART = 21;

const DAY_MS = 86_400_000;
// Floor on Δt so multiple same-day readings still nudge the trend instead of
// being ignored (Δt=0 → α=0). Half a day keeps daily cadence untouched.
const MIN_DT_DAYS = 0.5;

export interface TrendBands {
	trend: number[]; // smoothed value per measurement
	upper: number[]; // trend + 1σ (EW)
	lower: number[]; // trend − 1σ (EW)
}

/**
 * @param values  measurement values in chronological order
 * @param dates   matching dates (Date or ISO string), same length as `values`
 * @param tauDays time constant in days — larger = smoother / longer memory
 */
export function timeDecayedTrend(
	values: number[],
	dates: Array<Date | string | number>,
	tauDays: number = TREND_TAU_DAYS
): TrendBands {
	const n = values.length;
	const trend: number[] = new Array(n);
	const upper: number[] = new Array(n);
	const lower: number[] = new Array(n);

	let t = 0; // running trend
	let ewVar = 0; // running exponentially-weighted variance
	let prevMs = 0;

	for (let i = 0; i < n; i++) {
		const x = values[i];
		const ms = new Date(dates[i]).getTime();
		if (i === 0) {
			t = x;
			ewVar = 0;
		} else {
			const dt = Math.max(MIN_DT_DAYS, (ms - prevMs) / DAY_MS);
			const alpha = 1 - Math.exp(-dt / tauDays);
			const diff = x - t;
			t = t + alpha * diff;
			// West/RiskMetrics incremental EW variance of the residual.
			ewVar = (1 - alpha) * (ewVar + alpha * diff * diff);
		}
		prevMs = ms;
		const std = Math.sqrt(ewVar);
		trend[i] = t;
		upper[i] = t + std;
		lower[i] = t - std;
	}

	return { trend, upper, lower };
}

export interface SparseTrendBands {
	trend: (number | null)[];
	upper: (number | null)[];
	lower: (number | null)[];
}

/**
 * Trend ± 1σ for a series with gaps, aligned back to the original axis.
 *
 * Paired body measurements can carry a reading for one side only, so the trend is
 * computed over just the points that exist — feeding nulls to the smoother would
 * treat "not measured" as a value — and then scattered back into a full-length
 * array with nulls where there was nothing. Charts here span gaps, so a band stays
 * continuous across a date where only the other side was recorded.
 *
 * Returns null below two points: a single reading yields a trend equal to itself
 * and a zero-width band, which is noise presented as information.
 */
export function sparseTrend(
	values: (number | null | undefined)[],
	dates: Array<Date | string | number>,
	tauDays: number = TREND_TAU_DAYS,
	round: (v: number) => number = (v) => Math.round(v * 100) / 100
): SparseTrendBands | null {
	const present: number[] = [];
	const presentDates: Array<Date | string | number> = [];
	const indices: number[] = [];

	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if (v == null || Number.isNaN(v)) continue;
		present.push(v);
		presentDates.push(dates[i]);
		indices.push(i);
	}
	if (present.length < 2) return null;

	const { trend, upper, lower } = timeDecayedTrend(present, presentDates, tauDays);
	const out: SparseTrendBands = {
		trend: new Array(values.length).fill(null),
		upper: new Array(values.length).fill(null),
		lower: new Array(values.length).fill(null),
	};
	for (let j = 0; j < indices.length; j++) {
		out.trend[indices[j]] = round(trend[j]);
		out.upper[indices[j]] = round(upper[j]);
		out.lower[indices[j]] = round(lower[j]);
	}
	return out;
}

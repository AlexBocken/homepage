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

// Body-weight weigh-ins: often daily, change fast → ~2-week memory.
export const TREND_TAU_DAYS = 14;
// Strength metrics (1RM / max weight / volume): trained only ~1-2×/week and move
// slowly, so they want far heavier smoothing — a ~6-week memory.
export const TREND_TAU_DAYS_STRENGTH = 42;

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

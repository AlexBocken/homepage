// When does the current trend reach the goal — and, if a date is set, what rate
// would be needed to make it.
//
// The rate comes from `linearFit`: least squares through the readings of the
// last month, which is a claim anyone can check against the chart by eye.
// Everything below is bookkeeping around that one number — and most of it is
// about refusing to answer:
// an arrival date is only worth printing when the data can actually support one,
// and a projection that outlives the assumption behind it ("the rate holds") is
// worse than no projection at all.

import { linearFit, RATE_WINDOW_DAYS, type LinearFit } from './trend';

const DAY_MS = 86_400_000;

// Below these, a slope is a rumour — and both are counted inside the fitting
// window, not across all history: four readings spread over a fortnight is the
// least that pins a direction down at all.
export const MIN_POINTS = 4;
export const MIN_SPAN_DAYS = 14;
// Past a year, "at the current rate" has stopped being a sentence about the
// body and become one about arithmetic — fat loss slows as you get leaner, and
// nobody holds a deficit that long unbroken.
export const MAX_HORIZON_DAYS = 366;

export interface GoalPoint {
	date: Date | string | number;
	value: number;
}

interface Base {
	/** The fitted value at the last reading (lag-free, unlike the EMA line). */
	level: number;
	/** Signed, in units per week — what the tile shows. */
	ratePerWeek: number;
	/** Timestamp the projection starts from: the last reading. */
	fromMs: number;
}

export type GoalForecast =
	/** Not enough readings, or they span too little time, to fit a rate. */
	| { status: 'insufficient'; points: number; spanDays: number }
	/** The trend has crossed the goal during the fitted window. */
	| ({ status: 'reached' } & Base)
	/** Moving, but away from the goal. */
	| ({ status: 'wrong-way' } & Base)
	/** Rate is not distinguishable from standing still. */
	| ({ status: 'flat' } & Base)
	/** Heading there, but further out than we are willing to claim. */
	| ({ status: 'far' } & Base)
	/** An actual date. */
	| ({
			status: 'eta';
			etaMs: number;
			days: number;
			/** Bounds from slope ± 1 standard error; `latestMs` is null when the
			 *  slow end of that range never gets there. */
			earliestMs: number;
			latestMs: number | null;
	  } & Base);

export interface GoalTarget {
	/** The value being aimed at, in the series' own units. */
	goal: number;
	/** Optional deadline. Turns the forecast into a comparison. */
	targetDate?: Date | string | number | null;
}

export interface GoalPacing {
	targetMs: number;
	/** Units per week needed from `level` to land on the goal by `targetMs`. */
	requiredRatePerWeek: number;
	/** Predicted arrival minus deadline, in days. Negative is early. */
	deltaDays: number | null;
	/** True when the deadline has passed without the goal being met. */
	overdue: boolean;
}

export interface GoalReport {
	forecast: GoalForecast;
	/** Present only when a target date is set and a rate could be fitted. */
	pacing: GoalPacing | null;
	/** The fit itself, for callers that want to draw the line. */
	fit: LinearFit | null;
}

/** What `classify` decides: the branch, plus the arrival numbers when it took
 *  the branch that has them. Widened into `GoalForecast` once the shared fields
 *  are merged in. */
interface Classification {
	status: GoalForecast['status'];
	days?: number;
	etaMs?: number;
	earliestMs?: number;
	latestMs?: number | null;
}

/** Chronological, finite readings only — the fit assumes both. */
function clean(points: GoalPoint[]): GoalPoint[] {
	return points
		.filter((p) => p && typeof p.value === 'number' && Number.isFinite(p.value) && Number.isFinite(new Date(p.date).getTime()))
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Forecast one series against one goal.
 *
 * @param points      readings in any order; sorted and cleaned here
 * @param target      the value, and optionally the date it is wanted by
 * @param windowDays  how far back the straight line is fitted
 */
export function forecastGoal(points: GoalPoint[], target: GoalTarget, windowDays: number = RATE_WINDOW_DAYS): GoalReport {
	const pts = clean(points);
	const fit = linearFit(
		pts.map((p) => p.value),
		pts.map((p) => p.date),
		windowDays
	);

	if (!fit || fit.n < MIN_POINTS || fit.spanDays < MIN_SPAN_DAYS) {
		return {
			forecast: { status: 'insufficient', points: fit?.n ?? pts.length, spanDays: fit?.spanDays ?? 0 },
			pacing: null,
			fit: null
		};
	}

	const base: Base = { level: fit.level, ratePerWeek: fit.slope * 7, fromMs: fit.lastMs };
	const gap = target.goal - fit.level;
	const targetMs = target.targetDate != null ? new Date(target.targetDate).getTime() : null;

	const forecast = classify(fit, gap);
	const pacing = targetMs != null && Number.isFinite(targetMs) ? pace(fit, gap, targetMs, forecast) : null;

	return { forecast: { ...forecast, ...base } as GoalForecast, pacing, fit };
}

/** The branch decision, kept apart from the arithmetic that decorates it. */
function classify(fit: LinearFit, gap: number): Classification {
	// Where the same line sat at the start of the fitted window. A goal lying
	// between then and now has been crossed, which reads as "reached" — not as
	// "moving away", which is what the bare sign of the rate would say once you
	// are past it and still going.
	const goalValue = fit.level + gap;
	const startLevel = fit.level - fit.slope * fit.spanDays;
	if ((goalValue - fit.level) * (goalValue - startLevel) <= 0) return { status: 'reached' };

	// A slope smaller than its own standard error is not a direction, it is noise
	// with a sign. Naming a date off it would be dressing up a coin flip.
	if (!(Math.abs(fit.slope) > fit.seSlope)) return { status: 'flat' };
	if (Math.sign(fit.slope) !== Math.sign(gap)) return { status: 'wrong-way' };

	const days = gap / fit.slope;
	if (!Number.isFinite(days) || days > MAX_HORIZON_DAYS) return { status: 'far' };

	// The arrival window: the fast end is the slope one standard error steeper,
	// the slow end one shallower. The slow end can fail to arrive at all, and
	// saying so is more honest than quoting a number from a near-zero slope.
	const fast = fit.slope + Math.sign(fit.slope) * fit.seSlope;
	const slow = fit.slope - Math.sign(fit.slope) * fit.seSlope;
	const fastDays = gap / fast;
	const slowDays = gap / slow;
	const slowValid = Math.sign(slow) === Math.sign(fit.slope) && Number.isFinite(slowDays) && slowDays <= MAX_HORIZON_DAYS;

	return {
		status: 'eta',
		days,
		etaMs: fit.lastMs + days * DAY_MS,
		earliestMs: fit.lastMs + Math.max(0, fastDays) * DAY_MS,
		latestMs: slowValid ? fit.lastMs + slowDays * DAY_MS : null
	};
}

/** The deadline half: what the goal demands, versus what the trend offers. */
function pace(fit: LinearFit, gap: number, targetMs: number, forecast: Classification): GoalPacing {
	const daysLeft = (targetMs - fit.lastMs) / DAY_MS;
	const reached = forecast.status === 'reached';
	return {
		targetMs,
		// Past the deadline there is no rate that helps, so the number stops
		// meaning anything and is reported as zero-days-left rather than infinity.
		requiredRatePerWeek: daysLeft > 0 ? (gap / daysLeft) * 7 : 0,
		deltaDays: forecast.etaMs != null ? (forecast.etaMs - targetMs) / DAY_MS : null,
		overdue: !reached && daysLeft <= 0
	};
}

/**
 * Per-day body-weight trend, expenditure and intake totals shared by the
 * nutrition stats endpoints (stats/nutrition, stats/daily-balance,
 * stats/protein-per-kg). They must agree with one another — the cards, the
 * calorie-balance grid and the protein deep dive all divide or multiply by the
 * same smoothed weight — so the maths lives here once.
 *
 * Pure: no DB, no SvelteKit.
 */

import { computeTdee, type Sex } from '$lib/fitness/energy';

export interface WeighIn {
	date: Date | string;
	weight: number;
}

export interface TrendWeightLookup {
	/** Smoothed weight keyed by `YYYY-MM-DD` of each weigh-in, chronological. */
	byDate: Map<string, number>;
	/** Trend weight at the most recent weigh-in, or null with none. */
	latest: number | null;
	/** Trend weight on a day: that day's value, else the most recent prior one. */
	on(dateStr: string): number | null;
}

/**
 * Causal simple moving average over the weigh-ins (which must be sorted
 * ascending). The window is half the number of weigh-ins, clamped to 2..7, and
 * shrinks at the start of the series; each value is rounded to 0.01 kg. Two
 * weigh-ins on the same day share one key — the later one wins.
 */
export function buildTrendWeightLookup(measurements: WeighIn[]): TrendWeightLookup {
	const byDate = new Map<string, number>();
	let latest: number | null = null;
	if (measurements.length > 0) {
		const all = measurements.map((m) => ({
			date: new Date(m.date).toISOString().slice(0, 10),
			weight: m.weight
		}));
		const w = Math.min(7, Math.max(2, Math.floor(all.length / 2)));
		for (let i = 0; i < all.length; i++) {
			const k = Math.min(w, i + 1);
			let sum = 0;
			for (let j = i - k + 1; j <= i; j++) sum += all[j].weight;
			byDate.set(all[i].date, Math.round((sum / k) * 100) / 100);
		}
		latest = byDate.get(all[all.length - 1].date) ?? null;
	}
	function on(dateStr: string): number | null {
		if (byDate.has(dateStr)) return byDate.get(dateStr)!;
		let found: number | null = null;
		for (const [d, tw] of byDate) if (d <= dateStr) found = tw;
		return found;
	}
	return { byDate, latest, on };
}

/** The goal fields expenditure needs. */
export interface TdeeProfile {
	heightCm?: number | null;
	birthYear?: number | null;
	sex?: Sex | null;
	activityLevel?: string | null;
}

/** Whether a profile carries enough to estimate expenditure at all. */
export function canEstimateTdee(goal: TdeeProfile | null | undefined): boolean {
	return !!(goal?.heightCm && goal?.birthYear);
}

/**
 * NEAT-only expenditure (BMR × activity multiplier, no workouts) for a day
 * weighed at `weightKg`. Age is `year − birthYear`. Null when the profile lacks
 * height or birth year, or there is no (non-zero) weight.
 */
export function tdeeForDay(
	weightKg: number | null | undefined,
	goal: TdeeProfile | null | undefined,
	year: number
): number | null {
	if (!canEstimateTdee(goal) || !weightKg) return null;
	const g = goal!;
	return computeTdee(weightKg, g.heightCm!, year - g.birthYear!, g.sex ?? 'male', g.activityLevel);
}

/** A food-log entry resolved to per-100 g values. */
export interface Per100gEntry {
	date: Date | string;
	amountGrams?: number | null;
	per100g?: Record<string, number | null | undefined> | null;
}

/**
 * Sum the given per-100 g fields per day (`YYYY-MM-DD` of the entry date),
 * scaled by each entry's grams. Days come out in first-seen order; a missing
 * field or amount counts as 0.
 */
export function dailyTotals<K extends string>(
	entries: Per100gEntry[],
	keys: readonly K[]
): Map<string, Record<K, number>> {
	const byDate = new Map<string, Record<K, number>>();
	for (const e of entries) {
		const date = new Date(e.date).toISOString().slice(0, 10);
		let day = byDate.get(date);
		if (!day) {
			day = {} as Record<K, number>;
			for (const k of keys) day[k] = 0;
			byDate.set(date, day);
		}
		const mult = (e.amountGrams ?? 0) / 100;
		for (const k of keys) day[k] += (e.per100g?.[k] ?? 0) * mult;
	}
	return byDate;
}

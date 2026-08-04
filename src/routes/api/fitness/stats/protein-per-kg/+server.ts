import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { resolveEntries } from '$lib/server/foodLogComponents';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { localDateStr, localDateOffset } from '$lib/js/localDate';

/**
 * Per-day protein-per-kilogram series behind the stats page's protein card.
 *
 * The card shows one number — the 7-day average g/kg against the *current* trend
 * weight. This is the deep dive: one row per logged day, each dividing that day's
 * protein by the trend weight **as it stood on that day**, so an old day is judged
 * against the body that ate it rather than against today's. That makes the line
 * comparable over a bulk or a cut, where dividing everything by today's weight
 * would tilt the whole history.
 *
 * The trend weight is the same causal SMA the overview and calorie-balance views
 * use (see stats/nutrition and stats/daily-balance), so the three agree. Days
 * without logged food are absent; days before the first weigh-in carry a null
 * gPerKg (protein is still reported, it just cannot be normalised yet).
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Window length in days; a year by default. Clamped so a hand-edited query
	// can't ask for an unbounded scan.
	const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '365', 10) || 365, 30), 730);

	// Completed days only — today is still in progress. Day keys are UTC-midnight of
	// the local calendar day (see localDate.ts), so derive bounds from the local date.
	const todayStart = new Date(localDateStr() + 'T00:00:00.000Z');
	const windowStart = new Date(localDateOffset(-days) + 'T00:00:00.000Z');

	const [entriesRaw, goal, weightMeasurements] = await Promise.all([
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: { $gte: windowStart, $lt: todayStart },
			mealType: { $ne: 'water' },
		}).lean() as any,
		FitnessGoal.findOne({ username: user.nickname }).lean() as any,
		// Unbounded on purpose: a day early in the window is normalised against the
		// most recent weigh-in *before* it, which may predate the window.
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ date: 1, weight: 1, _id: 0 }
		).sort({ date: 1 }).lean() as unknown as any[],
	]);

	// Entries are references; resolve to blended per100g (only protein is read here).
	const entries = await resolveEntries(entriesRaw as any[]);

	// Daily protein intake, grams.
	const proteinByDate = new Map<string, number>();
	for (const e of entries) {
		const date = new Date(e.date).toISOString().slice(0, 10);
		const mult = (e.amountGrams ?? 0) / 100;
		proteinByDate.set(date, (proteinByDate.get(date) ?? 0) + (e.per100g?.protein ?? 0) * mult);
	}

	// Per-day trend weight: causal SMA over the measurements up to that day, same
	// shape as the stats overview, so the divisor is a smoothed weight rather than a
	// single noisy reading.
	const trendByDate = new Map<string, number>();
	let latestTrend: number | null = null;
	if (weightMeasurements.length > 0) {
		const all = weightMeasurements.map(m => ({ date: new Date(m.date).toISOString().slice(0, 10), weight: m.weight as number }));
		const w = Math.min(7, Math.max(2, Math.floor(all.length / 2)));
		for (let i = 0; i < all.length; i++) {
			const k = Math.min(w, i + 1);
			let sum = 0;
			for (let j = i - k + 1; j <= i; j++) sum += all[j].weight;
			trendByDate.set(all[i].date, Math.round((sum / k) * 100) / 100);
		}
		latestTrend = trendByDate.get(all[all.length - 1].date) ?? null;
	}
	/** Trend weight on a date: exact match, else the most recent prior measurement. */
	function trendWeightForDate(dateStr: string): number | null {
		if (trendByDate.has(dateStr)) return trendByDate.get(dateStr)!;
		let latest: number | null = null;
		for (const [d, tw] of trendByDate) if (d <= dateStr) latest = tw;
		return latest;
	}

	// The goal expressed in g/kg for a given day. A per-kg goal already is one and
	// stays flat; a fixed grams/day goal converts through that day's weight, so it
	// drifts as the body does — which is exactly the point of viewing it per kg.
	const proteinMode: 'fixed' | 'per_kg' | null = goal?.proteinMode ?? null;
	const proteinTarget: number | null = goal?.proteinTarget ?? null;
	function targetPerKgForDate(weight: number | null): number | null {
		if (!proteinTarget) return null;
		if (proteinMode === 'per_kg') return proteinTarget;
		if (!weight) return null;
		return Math.round((proteinTarget / weight) * 100) / 100;
	}

	const series = [...proteinByDate.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, protein]) => {
			const weight = trendWeightForDate(date);
			const grams = Math.round(protein * 10) / 10;
			return {
				date,
				protein: grams,
				weight,
				gPerKg: weight ? Math.round((protein / weight) * 100) / 100 : null,
				targetPerKg: targetPerKgForDate(weight),
			};
		});

	// Averages over the days that could be normalised, so an un-weighed stretch
	// doesn't drag the mean. Weighted by day, not by gram.
	const normalised = series.filter(d => d.gPerKg != null);
	const avgOver = (n: number): number | null => {
		const recent = normalised.slice(-n);
		if (!recent.length) return null;
		return Math.round((recent.reduce((s, d) => s + (d.gPerKg as number), 0) / recent.length) * 100) / 100;
	};

	return json({
		days,
		start: windowStart.toISOString().slice(0, 10),
		end: localDateOffset(-1),
		proteinMode,
		proteinTarget,
		// The goal line as it stands today; the series carries the per-day version.
		targetPerKg: targetPerKgForDate(latestTrend),
		trendWeight: latestTrend,
		avg7: avgOver(7),
		avg30: avgOver(30),
		daysNormalised: normalised.length,
		daysLogged: series.length,
		series,
	});
};

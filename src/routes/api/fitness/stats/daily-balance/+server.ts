import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { resolveEntries } from '$lib/server/foodLogComponents';
import { FitnessGoal } from '$models/FitnessGoal';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { WorkoutSession } from '$models/WorkoutSession';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { computeBmr, activityMultiplier } from '$lib/fitness/energy';

/**
 * Per-day calorie series for the activity-grid and bar-chart views: for every day
 * with logged food in the window, its intake, estimated expenditure (BMR·NEAT +
 * workout kcal), the resulting balance (intake − expenditure) and whether it landed
 * within ±10% of that day's goal. Non-logged days are simply absent — the client
 * fills the calendar and renders them as "not logged".
 *
 * Mirrors the definitions the stats-page cards use (see stats/nutrition) so the grid
 * and the headline numbers agree, but keeps one row per day instead of averaging.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// Window length in days; a year by default (a GitHub-style grid). Clamped so a
	// hand-edited query can't ask for an unbounded scan.
	const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '365', 10) || 365, 30), 730);

	// Completed days only — today is still in progress. Day keys are UTC-midnight of
	// the local calendar day (see localDate.ts), so derive bounds from the local date.
	const now = new Date();
	const todayStart = new Date(localDateStr() + 'T00:00:00.000Z');
	const windowStart = new Date(localDateOffset(-days) + 'T00:00:00.000Z');

	const [entriesRaw, goal, weightMeasurements, workoutSessions] = await Promise.all([
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: { $gte: windowStart, $lt: todayStart },
			mealType: { $ne: 'water' },
		}).lean() as any,
		FitnessGoal.findOne({ username: user.nickname }).lean() as any,
		BodyMeasurement.find(
			{ createdBy: user.nickname, weight: { $ne: null } },
			{ date: 1, weight: 1, _id: 0 }
		).sort({ date: 1 }).lean() as unknown as any[],
		WorkoutSession.find(
			{ createdBy: user.nickname, startTime: { $gte: windowStart, $lt: todayStart }, 'kcalEstimate.kcal': { $gt: 0 } },
			{ startTime: 1, 'kcalEstimate.kcal': 1, _id: 0 }
		).lean() as unknown as any[],
	]);

	// Entries are references; resolve to blended per100g (macros only are read here).
	const entries = await resolveEntries(entriesRaw as any[]);

	// Daily intake.
	const calByDate = new Map<string, number>();
	for (const e of entries) {
		const date = new Date(e.date).toISOString().slice(0, 10);
		const mult = (e.amountGrams ?? 0) / 100;
		calByDate.set(date, (calByDate.get(date) ?? 0) + (e.per100g?.calories ?? 0) * mult);
	}

	// Workout kcal per day.
	const workoutByDate = new Map<string, number>();
	for (const s of workoutSessions) {
		const key = new Date(s.startTime).toISOString().slice(0, 10);
		workoutByDate.set(key, (workoutByDate.get(key) ?? 0) + (s.kcalEstimate?.kcal ?? 0));
	}

	// Per-day trend weight: SMA over the measurements up to that day, same shape as
	// the stats overview, so expenditure uses a smoothed weight rather than a noisy
	// single reading.
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

	const goalCalories: number | null = goal?.dailyCalories ?? null;
	const neatMult = activityMultiplier(goal?.activityLevel);
	const canComputeTdee = !!(goal?.heightCm && goal?.birthYear);

	function tdeeForDate(dateStr: string): number | null {
		if (!canComputeTdee) return null;
		const w = trendWeightForDate(dateStr);
		if (!w) return null;
		const age = now.getFullYear() - goal.birthYear;
		return computeBmr(w, goal.heightCm, age, goal.sex ?? 'male') * neatMult;
	}

	const series = [...calByDate.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, calories]) => {
			const workout = workoutByDate.get(date) ?? 0;
			const tdee = tdeeForDate(date);
			const expenditure = tdee != null ? Math.round(tdee + workout) : null;
			const balance = expenditure != null ? Math.round(calories - expenditure) : null;
			const dayGoal = goalCalories != null ? goalCalories + workout : null;
			const adhered = dayGoal != null && calories >= dayGoal * 0.9 && calories <= dayGoal * 1.1;
			return { date, calories: Math.round(calories), expenditure, balance, goal: dayGoal != null ? Math.round(dayGoal) : null, adhered };
		});

	return json({
		days,
		start: windowStart.toISOString().slice(0, 10),
		end: localDateOffset(-1),
		goalCalories,
		hasTdee: canComputeTdee && latestTrend != null,
		series,
	});
};

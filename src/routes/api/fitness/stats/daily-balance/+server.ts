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
import { buildTrendWeightLookup, canEstimateTdee, dailyTotals, tdeeForDay } from '$lib/fitness/bodyTrend';
import { backfillDailyTargets, calorieTargetsInRange } from '$lib/server/dailyTargets';

/**
 * Per-day calorie series for the activity-grid and bar-chart views: for every day
 * with logged food in the window, its intake, estimated expenditure (BMR·NEAT +
 * workout kcal), the resulting balance (intake − expenditure) and whether it landed
 * within ±10% of that day's goal — the goal *that day* was eaten against, which is
 * not the current one once the target moves. Non-logged days are simply absent —
 * the client fills the calendar and renders them as "not logged".
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
	const calByDate = dailyTotals(entries, ['calories'] as const);

	// Workout kcal per day.
	const workoutByDate = new Map<string, number>();
	for (const s of workoutSessions) {
		const key = new Date(s.startTime).toISOString().slice(0, 10);
		workoutByDate.set(key, (workoutByDate.get(key) ?? 0) + (s.kcalEstimate?.kcal ?? 0));
	}

	// Per-day trend weight: SMA over the measurements up to that day, same shape as
	// the stats overview, so expenditure uses a smoothed weight rather than a noisy
	// single reading.
	const trend = buildTrendWeightLookup(weightMeasurements);
	const latestTrend = trend.latest;

	const goalCalories: number | null = goal?.dailyCalories ?? null;

	// Any logged day still without a stored target gets today's goal written for it
	// now, so it is pinned before the goal moves again.
	await backfillDailyTargets(user.nickname, goalCalories);
	const targets = await calorieTargetsInRange(
		user.nickname,
		windowStart.toISOString().slice(0, 10),
		localDateOffset(-1),
	);
	/** The goal a day was eaten against; the current goal for days predating targets. */
	const goalForDate = (dateStr: string): number | null => targets.get(dateStr) ?? goalCalories;

	const canComputeTdee = canEstimateTdee(goal);
	const year = now.getFullYear();
	const tdeeForDate = (dateStr: string): number | null => tdeeForDay(trend.on(dateStr), goal, year);

	const series = [...calByDate.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, { calories }]) => {
			const workout = workoutByDate.get(date) ?? 0;
			const tdee = tdeeForDate(date);
			const expenditure = tdee != null ? Math.round(tdee + workout) : null;
			const balance = expenditure != null ? Math.round(calories - expenditure) : null;
			const dayTarget = goalForDate(date);
			const dayGoal = dayTarget != null ? dayTarget + workout : null;
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

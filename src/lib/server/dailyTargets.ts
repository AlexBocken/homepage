import { DailyNutritionTarget } from '$models/DailyNutritionTarget';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { FitnessGoal } from '$models/FitnessGoal';
import { localDateStr } from '$lib/js/localDate';

/**
 * Per-day calorie targets: the goal each day was actually eaten against.
 *
 * Rules, in one place because every writer has to agree on them:
 *  - A day gets stamped once, with the goal live at the time, and then never moves
 *    on its own. Backfilling on read (rather than only falling back on read) means
 *    a goal change later cannot silently re-judge it.
 *  - A goal change touches today and any already-logged future day. Everything
 *    before today keeps what it was eaten under.
 */

/** UTC-midnight day key, matching FoodLogEntry.date. */
const dayKey = (dateStr: string) => new Date(dateStr + 'T00:00:00.000Z');
/** `YYYY-MM-DD` label of a stored day key. */
const dayStr = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/** The user's current calorie goal, or null when they have never set one. */
async function currentCalorieGoal(username: string): Promise<number | null> {
	const goal = await FitnessGoal.findOne({ username }, { dailyCalories: 1 }).lean() as any;
	return typeof goal?.dailyCalories === 'number' ? goal.dailyCalories : null;
}

/**
 * Stamp `calories` onto the given days, never overwriting a day that already has a
 * target. Falls back to the current goal when no value is passed; a no-op when the
 * user has no goal at all (nothing meaningful to record).
 */
export async function stampDailyTargets(
	username: string,
	dateStrs: string[],
	calories?: number | null,
): Promise<void> {
	const days = [...new Set(dateStrs.filter(Boolean))];
	if (days.length === 0) return;

	const kcal = calories ?? await currentCalorieGoal(username);
	if (kcal == null) return;

	await DailyNutritionTarget.bulkWrite(
		days.map(d => ({
			updateOne: {
				filter: { username, date: dayKey(d) },
				update: { $setOnInsert: { dailyCalories: kcal } },
				upsert: true,
			},
		})),
		{ ordered: false },
	);
}

/**
 * Give every day with logged food a target, using `calories` (default: the current
 * goal) for the ones still missing one. Cheap when there is nothing to do, and safe
 * to call from read paths — it only ever fills gaps.
 */
export async function backfillDailyTargets(
	username: string,
	calories?: number | null,
): Promise<void> {
	const kcal = calories ?? await currentCalorieGoal(username);
	if (kcal == null) return;

	const [loggedDates, stamped] = await Promise.all([
		FoodLogEntry.distinct('date', { createdBy: username, mealType: { $ne: 'water' } }) as Promise<Date[]>,
		DailyNutritionTarget.distinct('date', { username }) as Promise<Date[]>,
	]);

	const have = new Set(stamped.map(dayStr));
	const missing = [...new Set(loggedDates.map(dayStr))].filter(d => !have.has(d));
	if (missing.length === 0) return;

	await stampDailyTargets(username, missing, kcal);
}

/** Stored targets for a date range (inclusive), keyed by `YYYY-MM-DD`. */
export async function calorieTargetsInRange(
	username: string,
	fromStr: string,
	toStr: string,
): Promise<Map<string, number>> {
	const rows = await DailyNutritionTarget.find(
		{ username, date: { $gte: dayKey(fromStr), $lte: dayKey(toStr) } },
		{ date: 1, dailyCalories: 1, _id: 0 },
	).lean() as unknown as { date: Date; dailyCalories: number }[];

	return new Map(rows.map(r => [dayStr(r.date), r.dailyCalories]));
}

/** The target stored for one day, or null when it has none. */
export async function calorieTargetForDate(username: string, dateStr: string): Promise<number | null> {
	const row = await DailyNutritionTarget.findOne(
		{ username, date: dayKey(dateStr) },
		{ dailyCalories: 1, _id: 0 },
	).lean() as unknown as { dailyCalories: number } | null;
	return row?.dailyCalories ?? null;
}

/**
 * Move the per-day targets after the calorie goal changed.
 *
 * Past days are pinned to `previous` first (the goal they were eaten under) so the
 * new number can't reach back; only today and any already-logged future day follow
 * the change. `previous` is null the first time a goal is ever set — then the new
 * goal is the only number we have for those days, so it stands in for them.
 */
export async function applyCalorieGoalChange(
	username: string,
	previous: number | null,
	next: number,
): Promise<void> {
	await backfillDailyTargets(username, previous ?? next);

	const today = dayKey(localDateStr());
	await DailyNutritionTarget.updateMany(
		{ username, date: { $gte: today } },
		{ $set: { dailyCalories: next } },
	);
	// Today gets a row even with nothing logged yet, so the day it is eaten against
	// is already fixed before the first entry lands.
	await DailyNutritionTarget.updateOne(
		{ username, date: today },
		{ $set: { dailyCalories: next } },
		{ upsert: true },
	);
}

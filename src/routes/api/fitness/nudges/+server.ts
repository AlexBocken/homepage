import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { FitnessGoal } from '$models/FitnessGoal';
import { WorkoutSession } from '$models/WorkoutSession';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { buildNudges, learnStaples, type Remaining } from '$lib/fitness/nudges';
import { resolveEntries } from '$lib/server/foodLogComponents';
import { entriesCalories, entriesMacroGrams } from '$lib/fitness/nutritionMath';
import { macroGoalGrams } from '$lib/fitness/macroGoals';
import { calorieTargetForDate } from '$lib/server/dailyTargets';

/** How far back to look for foods eaten often enough to count as staples. */
const STAPLE_WINDOW_DAYS = 90;
/** Distinct days a food must appear on before it is assumed to be in the house. */
const STAPLE_MIN_DAYS = 3;

/**
 * Ways to close out a day, built from what this person actually eats.
 *
 * There is no curated pantry list any more. Everything suggested is either already
 * on today's plate or a food eaten on at least three separate days in the last three
 * months — which is the only evidence the app has about what is in someone's
 * kitchen, and it is far better evidence than a hardcoded list of foods a
 * nutritionist would pick.
 *
 * The remaining macros can be passed in or left out. The nutrition page passes them,
 * because it knows them live — including edits made since the page loaded. Left out,
 * they are derived here from the stored goal and the day's log, which is what lets the
 * page's server load render this card in its first paint (see the page's load: it can
 * request the nudges in the same parallel wave as everything else, instead of waiting
 * for the goal and food log to come back first).
 *
 * No cache. The previous solver was O(n³) over a combined food pool and needed one;
 * this scans a few dozen candidates in 5 g steps, which is not worth the two bugs
 * the cache carried (a key that ignored the requested date, and a date-type mismatch
 * in the recents query).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const askedFor = ['remainingKcal', 'remainingProtein', 'remainingFat', 'remainingCarbs']
		.map((k) => url.searchParams.get(k));
	let remaining: Remaining | null = null;
	if (askedFor.some((v) => v != null)) {
		remaining = {
			kcal: Number(askedFor[0] ?? 0),
			protein: Number(askedFor[1] ?? 0),
			fat: Number(askedFor[2] ?? 0),
			carbs: Number(askedFor[3] ?? 0),
		};
		for (const [k, v] of Object.entries(remaining)) {
			if (!Number.isFinite(v)) throw error(400, `${k} must be a number`);
		}
	}

	const dateStr = url.searchParams.get('date') || localDateStr();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw error(400, 'Invalid date');

	const dayStart = new Date(dateStr + 'T00:00:00.000Z');
	const dayEnd = new Date(dateStr + 'T23:59:59.999Z');
	const stapleFrom = new Date(localDateOffset(-STAPLE_WINDOW_DAYS) + 'T00:00:00.000Z');

	const [todaysRaw, historyRaw] = await Promise.all([
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: { $gte: dayStart, $lte: dayEnd },
			mealType: { $ne: 'water' },
		}).lean() as any,
		FoodLogEntry.find({
			createdBy: user.nickname,
			date: { $gte: stapleFrom },
			mealType: { $ne: 'water' },
		}).lean() as any,
	]);
	// Entries are references; resolve to live nutrition (blended per100g, derived
	// amountGrams, presentation source/sourceId) before the nudge logic reads them.
	const [todays, history] = await Promise.all([
		resolveEntries(todaysRaw as any[]),
		resolveEntries(historyRaw as any[]),
	]);

	const logged = todays.map((e: any) => ({
		id: String(e._id),
		name: e.name,
		amountGrams: e.amountGrams,
		per100g: e.per100g,
		mealType: e.mealType,
	}));

	// A food already on today's plate is reached by bumping it, not by logging a
	// second entry for the same thing.
	const loggedKeys = new Set(
		todays.filter((e: any) => e.source && e.sourceId).map((e: any) => `${e.source}:${e.sourceId}`)
	);
	const staples = learnStaples(history, STAPLE_MIN_DAYS)
		.filter(s => !loggedKeys.has(`${s.source}:${s.sourceId}`));

	// Not told what is left: work it out from the goal this day was eaten against, the
	// day's own log and its logged exercise. Deliberately the same shape as the page's
	// first render — the shared macro-goal helper, logged exercise only (the page's
	// projected-workout toggle starts off), and no suggestions for a past day, which
	// cannot be added to.
	if (!remaining) {
		if (dateStr < localDateStr()) return json({ nudges: [], stapleCount: staples.length, remaining: null });

		const [goal, latestWeight, sessions, dayTarget] = await Promise.all([
			FitnessGoal.findOne({ username: user.nickname }).lean() as any,
			BodyMeasurement.findOne({ createdBy: user.nickname, weight: { $exists: true, $ne: null } })
				.sort({ date: -1 }).select('weight').lean() as any,
			WorkoutSession.find({
				createdBy: user.nickname,
				startTime: { $gte: dayStart, $lte: dayEnd },
			}).select('kcalEstimate').lean() as unknown as any[],
			calorieTargetForDate(user.nickname, dateStr),
		]);

		const baseGoal = dayTarget ?? goal?.dailyCalories ?? null;
		if (!baseGoal) return json({ nudges: [], stapleCount: staples.length, remaining: null });

		const burned = sessions.reduce((sum, s) => sum + (s.kcalEstimate?.kcal ?? 0), 0);
		const calorieGoal = baseGoal + Math.round(burned);
		const goals = macroGoalGrams({
			calorieGoal,
			proteinMode: goal?.proteinMode,
			proteinTarget: goal?.proteinTarget,
			weightKg: latestWeight?.weight ?? null,
			fatPercent: goal?.fatPercent,
			carbPercent: goal?.carbPercent,
		});
		const eatenMacros = entriesMacroGrams(todays as any[]);
		remaining = {
			kcal: Math.round(calorieGoal - entriesCalories(todays as any[])),
			protein: Math.round(goals.protein ? goals.protein - eatenMacros.protein : 0),
			fat: Math.round(goals.fat ? goals.fat - eatenMacros.fat : 0),
			carbs: Math.round(goals.carbs ? goals.carbs - eatenMacros.carbs : 0),
		};
	}

	const nudges = buildNudges(remaining, logged, staples, 5);

	// The remainders are echoed back so a caller that did not supply them (the page's
	// load) can tell whether its own live numbers still match what these were built
	// from, and skip re-requesting the identical list on hydration.
	return json({ nudges, stapleCount: staples.length, remaining });
};

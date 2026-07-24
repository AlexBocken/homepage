import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { buildNudges, learnStaples } from '$lib/fitness/nudges';
import { resolveEntries } from '$lib/server/foodLogComponents';

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
 * No cache. The previous solver was O(n³) over a combined food pool and needed one;
 * this scans a few dozen candidates in 5 g steps, which is not worth the two bugs
 * the cache carried (a key that ignored the requested date, and a date-type mismatch
 * in the recents query).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const remaining = {
		kcal: Number(url.searchParams.get('remainingKcal') ?? 0),
		protein: Number(url.searchParams.get('remainingProtein') ?? 0),
		fat: Number(url.searchParams.get('remainingFat') ?? 0),
		carbs: Number(url.searchParams.get('remainingCarbs') ?? 0),
	};
	for (const [k, v] of Object.entries(remaining)) {
		if (!Number.isFinite(v)) throw error(400, `${k} must be a number`);
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

	const nudges = buildNudges(remaining, logged, staples, 5);

	return json({ nudges, stapleCount: staples.length });
};

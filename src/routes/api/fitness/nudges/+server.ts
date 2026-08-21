import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { BodyMeasurement } from '$models/BodyMeasurement';
import { FitnessGoal } from '$models/FitnessGoal';
import { WorkoutSession } from '$models/WorkoutSession';
import { localDateStr, localDateOffset } from '$lib/js/localDate';
import { Recipe } from '$models/Recipe';
import { CustomMeal } from '$models/CustomMeal';
import { buildNudges, learnStaples, type Remaining, type DishFood } from '$lib/fitness/nudges';
import { parsePortions } from '$lib/js/recipeMacros';
import { recipeThumbUrl } from '$lib/utils/recipeImage';
import { resolveEntries, resolveLeaves, blendPer100g } from '$lib/server/foodLogComponents';
import { entriesCalories, entriesMacroGrams } from '$lib/fitness/nutritionMath';
import { macroGoalGrams } from '$lib/fitness/macroGoals';
import { trendValueOn } from '$lib/fitness/trend';
import { calorieTargetForDate } from '$lib/server/dailyTargets';

/**
 * Every recipe with usable cached nutrition, as a candidate dish.
 *
 * `cachedPer100g` is the figure the recipe's own listing card shows — it includes
 * the recipes a dish builds on, which summing the mappings here would miss — so a
 * suggested portion carries the same calories the recipe page states. A recipe whose
 * cache is unset was never calculated and one set to null has nothing to calculate;
 * neither can be portioned against a macro gap, so both are left out by the query.
 *
 * The names are stripped of the soft hyphens recipe titles carry for layout, exactly
 * as the food search does — they are invisible in HTML but not in a diary row.
 */
async function recipeCandidates(): Promise<DishFood[]> {
	const docs = await Recipe.find(
		// Base recipes are components — a dough, a starter, a stock. They are eaten as
		// part of something else, so proposing one as a way to finish the day is
		// nonsense however well its macros happen to fit.
		{ cachedPer100g: { $ne: null }, cachedTotalGrams: { $gt: 0 }, isBaseRecipe: { $ne: true } },
		{
			name: 1, short_name: 1, portions: 1, cachedTotalGrams: 1,
			// Only the four macros the portion search reads. A recipe's cached
			// nutrition is the full nutrient set — projecting it whole would pull a
			// hundred fields per recipe across the whole collection for four of them.
			'cachedPer100g.calories': 1, 'cachedPer100g.protein': 1,
			'cachedPer100g.fat': 1, 'cachedPer100g.carbs': 1,
			'images.mediapath': 1,
			'translations.en.name': 1, 'translations.en.short_name': 1,
		},
	).lean() as any[];

	const out: DishFood[] = [];
	for (const r of docs) {
		const per100g = r.cachedPer100g;
		if (!per100g || !(per100g.calories > 0)) continue;

		const portionCount = parsePortions(r.portions);
		const mediapath = r.images?.[0]?.mediapath;
		out.push({
			name: stripSoftHyphens(r.name),
			source: 'recipe',
			sourceId: String(r._id),
			per100g,
			meta: {
				kind: 'recipe',
				slug: r.short_name,
				...(r.translations?.en?.short_name && { slugEn: r.translations.en.short_name }),
				...(r.translations?.en?.name && { nameEn: stripSoftHyphens(r.translations.en.name) }),
				...(mediapath && { image: recipeThumbUrl(mediapath) }),
				...(portionCount > 0 && { portionGrams: r.cachedTotalGrams / portionCount }),
			},
		});
	}
	return out;
}

function stripSoftHyphens(name: string): string {
	return (name ?? '').replace(/&shy;|\u00ad/g, '');
}

/**
 * The person's own saved meals, as candidate dishes.
 *
 * A meal is a list of references, so its nutrition is resolved live rather than read
 * off the document — one batched pass over every ingredient of every meal, which is a
 * single Open Food Facts round trip no matter how many meals there are.
 *
 * A meal is dropped when any ingredient fails to resolve (a barcode aged out of the
 * mirror, a USDA id dropped on re-import). Blending what is left would quietly
 * understate the meal and propose it as a fit it is not — and the whole point of the
 * fit gate is that the numbers behind it are trustworthy.
 */
async function mealCandidates(nickname: string): Promise<DishFood[]> {
	const meals = await CustomMeal.find({ createdBy: nickname }).lean() as any[];
	if (!meals.length) return [];

	const resolved = await resolveLeaves(
		meals.flatMap(m => (m.ingredients ?? []).map((i: any) => ({
			source: i.source, sourceId: i.sourceId, amountGrams: i.amountGrams ?? 0,
		}))),
	);

	const out: DishFood[] = [];
	let i = 0;
	for (const meal of meals) {
		const comps = (meal.ingredients ?? []).map(() => resolved[i++]);
		if (!comps.length || comps.some((c: any) => !c?.per100g)) continue;
		const totalGrams = comps.reduce((sum: number, c: any) => sum + (c?.amountGrams ?? 0), 0);
		if (!(totalGrams > 0)) continue;
		const per100g = blendPer100g(comps, totalGrams);
		if (!(per100g.calories > 0)) continue;
		out.push({
			name: meal.name,
			source: 'custom',
			sourceId: String(meal._id),
			per100g,
			// A meal has one serving — itself, as assembled. That is also the portion
			// the logger offers it in, so the card and the log agree on what "1×" means.
			meta: { kind: 'custom', portionGrams: totalGrams },
		});
	}
	return out;
}

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
 * Whole dishes — the site's own recipes and the person's own saved meals — are the
 * one thing offered that need not have been eaten before, and only when a portion of
 * one lands every macro on target: making a dish is a much bigger ask than a second
 * scoop of rice, so a merely-plausible fit is not worth proposing. Those rows are
 * pinned above the adjustments; see `GREAT_FIT_COST`.
 *
 * The remaining macros can be passed in or left out. The nutrition page passes them,
 * because it knows them live — including edits made since the page loaded. Left out,
 * they are derived here from the stored goal and the day's log, which is what lets the
 * page's server load render this card in its first paint (see the page's load: it can
 * request the nudges in the same parallel wave as everything else, instead of waiting
 * for the goal and food log to come back first).
 *
 * No cache. The previous solver was O(n³) over a combined food pool and needed one;
 * this scans each candidate independently in 5 g steps — a few hundred of them once
 * the recipes and meals are in, still a linear pass over projections Mongo serves
 * from two reads — which is not worth the two bugs the cache carried (a key that
 * ignored the requested date, and a date-type mismatch in the recents query).
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

	const [todaysRaw, historyRaw, recipes, meals] = await Promise.all([
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
		// Independent of the log, so they ride along rather than waiting for it.
		recipeCandidates(),
		mealCandidates(user.nickname),
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
	// Same rule for a dish already eaten today: more of it is a bump, not a new row.
	const dishes = [...recipes, ...meals]
		.filter(d => !loggedKeys.has(`${d.source}:${d.sourceId}`));

	// Not told what is left: work it out from the goal this day was eaten against, the
	// day's own log and its logged exercise. Deliberately the same shape as the page's
	// first render — the shared macro-goal helper, logged exercise only (the page's
	// projected-workout toggle starts off), and no suggestions for a past day, which
	// cannot be added to.
	if (!remaining) {
		if (dateStr < localDateStr()) return json({ nudges: [], stapleCount: staples.length, remaining: null });

		const [goal, weightHistory, sessions, dayTarget] = await Promise.all([
			FitnessGoal.findOne({ username: user.nickname }).lean() as any,
			// The weight trend on this day, matching what the page's rings are drawn
			// against. A raw latest reading would put these suggestions on a different
			// protein target than the ring above them — the exact drift the shared
			// macro-goal helper exists to prevent.
			BodyMeasurement.find({
				createdBy: user.nickname,
				weight: { $exists: true, $ne: null },
				date: { $lte: dayEnd },
			}).sort({ date: 1 }).select('date weight').lean() as any,
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
			weightKg: trendValueOn(
				(weightHistory ?? []).map((m: { date: Date; weight: number }) => ({
					date: m.date,
					value: m.weight,
				})),
				dateStr
			),
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

	const nudges = buildNudges(remaining, logged, staples, 5, dishes);

	// The remainders are echoed back so a caller that did not supply them (the page's
	// load) can tell whether its own live numbers still match what these were built
	// from, and skip re-requesting the identical list on hydration.
	return json({ nudges, stapleCount: staples.length, remaining });
};

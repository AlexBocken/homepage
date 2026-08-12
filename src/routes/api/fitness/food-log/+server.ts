import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { CustomMeal } from '$models/CustomMeal';
import { RoundOffCache } from '$models/RoundOffCache';
import { Recipe } from '$models/Recipe';
import { LOGGABLE_MEALS } from '$lib/fitness/meals';
import { coercePortion, coercePortions } from '$lib/fitness/portions';
import { recipeThumbUrl } from '$lib/utils/recipeImage';
import {
	resolveEntries, foodLeaf, mealLeaves, recipeLeaves,
	type LeafRef, type LeafSource,
} from '$lib/server/foodLogComponents';
import { stampDailyTargets } from '$lib/server/dailyTargets';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const dateParam = url.searchParams.get('date');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	const query: Record<string, any> = { createdBy: user.nickname };

	if (dateParam) {
		const d = new Date(dateParam + 'T00:00:00.000Z');
		const next = new Date(d);
		next.setUTCDate(next.getUTCDate() + 1);
		query.date = { $gte: d, $lt: next };
	} else if (from || to) {
		query.date = {};
		if (from) query.date.$gte = new Date(from + 'T00:00:00.000Z');
		if (to) {
			const t = new Date(to + 'T00:00:00.000Z');
			t.setUTCDate(t.getUTCDate() + 1);
			query.date.$lt = t;
		}
	}

	const stored = await FoodLogEntry.find(query).sort({ date: -1, mealType: 1 }).lean();
	// The stored rows are references; resolve them to live nutrition before handing
	// them out, so clients see a blended per100g + derived amountGrams exactly as
	// before, and a base-table fix shows up here with no re-log.
	const entries = await resolveEntries(stored as any[]);
	return json({ entries });
};

/** Build the frozen components for one logged food / meal / recipe. Throws a 400
 *  when the reference can't be resolved to any base-table nutrition. */
async function buildComponents(
	source: string,
	sourceId: string | undefined,
	amountGrams: number,
	leafExtras: { portions?: LeafRef['portions']; selectedPortion?: LeafRef['selectedPortion'] },
): Promise<{ components: LeafRef[]; loggedAs: { kind: 'food' | 'custom' | 'recipe'; refId?: any } }> {
	if (source === 'custom') {
		if (!sourceId) throw error(400, 'custom log needs a meal id');
		const meal = await CustomMeal.findById(sourceId).lean();
		if (!meal) throw error(400, 'custom meal not found');
		const components = await mealLeaves(meal, amountGrams);
		if (!components.length) throw error(400, 'custom meal resolved to no ingredients');
		return { components, loggedAs: { kind: 'custom', refId: (meal as any)._id } };
	}
	if (source === 'recipe') {
		if (!sourceId) throw error(400, 'recipe log needs a recipe id');
		const query = /^[0-9a-fA-F]{24}$/.test(sourceId) ? { _id: sourceId } : { short_name: sourceId };
		const recipe = await Recipe.findOne(query).select('short_name ingredients nutritionMappings finalWeight').lean();
		if (!recipe) throw error(400, 'recipe not found');
		const components = await recipeLeaves(recipe, amountGrams);
		if (!components.length) throw error(400, 'recipe resolved to no ingredients');
		return { components, loggedAs: { kind: 'recipe', refId: (recipe as any)._id } };
	}
	// Plain base-table food.
	if (source !== 'bls' && source !== 'usda' && source !== 'off') throw error(400, 'unknown source');
	if (!sourceId) throw error(400, 'food log needs a sourceId');
	const components = foodLeaf({ source: source as LeafSource, sourceId, ...leafExtras }, amountGrams);
	return { components, loggedAs: { kind: 'food' } };
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const body = await request.json();
	const { date, mealType, name, source, sourceId, amountGrams, liquidMl } = body;

	if (!date || !name?.trim()) throw error(400, 'date and name are required');
	if (!LOGGABLE_MEALS.includes(mealType)) throw error(400, 'Invalid mealType');
	if (typeof amountGrams !== 'number' || amountGrams <= 0) throw error(400, 'amountGrams must be positive');

	// Portions are display metadata, frozen onto the single leaf of a plain food.
	const portions = coercePortions(body.portions);
	const selectedPortion = coercePortion(body.selectedPortion);

	const { components, loggedAs } = await buildComponents(
		source || 'custom', sourceId, amountGrams,
		{ ...(portions && { portions }), ...(selectedPortion && { selectedPortion }) },
	);

	const entry = await FoodLogEntry.create({
		date: new Date(date + 'T00:00:00.000Z'),
		mealType,
		name: name.trim(),
		components,
		loggedAs,
		...(liquidMl > 0 && { liquidMl }),
		createdBy: user.nickname,
	});

	// Invalidate round-off cache for this date
	RoundOffCache.deleteOne({ createdBy: user.nickname, date: date.slice(0, 10) }).catch(() => {});

	// Pin the day to the goal that is live right now, so a later goal change judges
	// it against what it was actually eaten against.
	stampDailyTargets(user.nickname, [date.slice(0, 10)]).catch(() => {});

	// Hand back the entry in the resolved shape the client optimistically renders.
	const [hydrated] = await resolveEntries([entry.toObject() as any]);
	const created: Record<string, any> = hydrated;

	// The day page resolves recipe thumbnails once at load into a sourceId->url map;
	// a recipe logged afterwards isn't in it, so return the URL with the new entry.
	if (loggedAs.kind === 'recipe' && loggedAs.refId) {
		try {
			const recipe = await Recipe.findById(loggedAs.refId, { 'images.mediapath': 1 }).lean();
			const mediapath = (recipe as any)?.images?.[0]?.mediapath;
			if (mediapath) created.image = recipeThumbUrl(mediapath);
		} catch {
			// Image is a nicety — never fail a log over it.
		}
	}

	return json(created, { status: 201 });
};

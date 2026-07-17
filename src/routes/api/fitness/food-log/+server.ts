import { json, error } from '@sveltejs/kit';
import mongoose from 'mongoose';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { RoundOffCache } from '$models/RoundOffCache';
import { Recipe } from '$models/Recipe';
import { LOGGABLE_MEALS } from '$lib/fitness/meals';
import { coercePortion, coercePortions } from '$lib/fitness/portions';
import { recipeThumbUrl } from '$lib/utils/recipeImage';

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

	const entries = await FoodLogEntry.find(query).sort({ date: -1, mealType: 1 }).lean();
	return json({ entries });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const body = await request.json();
	const { date, mealType, name, source, sourceId, amountGrams, per100g, liquidMl } = body;

	if (!date || !name?.trim()) throw error(400, 'date and name are required');
	if (!LOGGABLE_MEALS.includes(mealType)) throw error(400, 'Invalid mealType');
	if (typeof amountGrams !== 'number' || amountGrams <= 0) throw error(400, 'amountGrams must be positive');
	if (!per100g || typeof per100g.calories !== 'number') throw error(400, 'per100g with calories is required');

	// Portions are display metadata only — amountGrams above stays the source of
	// truth, so invalid portion data is dropped rather than rejecting the log.
	const portions = coercePortions(body.portions);
	const selectedPortion = coercePortion(body.selectedPortion);

	const entry = await FoodLogEntry.create({
		date: new Date(date + 'T00:00:00.000Z'),
		mealType,
		name: name.trim(),
		source: source || 'custom',
		sourceId,
		amountGrams,
		...(portions && { portions }),
		...(selectedPortion && { selectedPortion }),
		per100g,
		...(liquidMl > 0 && { liquidMl }),
		createdBy: user.nickname,
	});

	// Invalidate round-off cache for this date
	RoundOffCache.deleteOne({ createdBy: user.nickname, date: date.slice(0, 10) }).catch(() => {});

	const created: Record<string, any> = entry.toObject();

	// The day page resolves recipe thumbnails once, at load, into a sourceId->url
	// map. A recipe logged after that isn't in the map, so it would render without
	// its image until the next navigation re-ran the load. Hand the URL back with
	// the created entry so the client can fill the gap. Response-only — the food
	// log doesn't store images, it points at the recipe.
	if (created.source === 'recipe' && created.sourceId && mongoose.Types.ObjectId.isValid(created.sourceId)) {
		try {
			const recipe = await Recipe.findById(created.sourceId, { 'images.mediapath': 1 }).lean();
			const mediapath = (recipe as any)?.images?.[0]?.mediapath;
			if (mediapath) created.image = recipeThumbUrl(mediapath);
		} catch {
			// Image is a nicety — never fail a log over it.
		}
	}

	return json(created, { status: 201 });
};

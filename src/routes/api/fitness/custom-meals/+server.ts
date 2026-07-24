import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { CustomMeal } from '$models/CustomMeal';
import { RoundOffCache } from '$models/RoundOffCache';
import { resolveLeaves } from '$lib/server/foodLogComponents';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const meals = await CustomMeal.find({ createdBy: user.nickname }).sort({ updatedAt: -1 }).lean() as any[];

	// Ingredients are stored as references; resolve each to a live per100g so the
	// editor and the meal list show current nutrition (one OFF round-trip for all
	// meals). A base-table fix shows up here without re-saving the meal.
	const refs = meals.flatMap(m => (m.ingredients ?? []).map((i: any) => ({
		source: i.source, sourceId: i.sourceId, amountGrams: i.amountGrams ?? 0,
	})));
	const resolved = await resolveLeaves(refs);
	let idx = 0;
	for (const m of meals) {
		for (const ing of m.ingredients ?? []) ing.per100g = resolved[idx++]?.per100g ?? {};
	}

	return json({ meals });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const body = await request.json();
	const { name, ingredients } = body;

	if (!name?.trim()) throw error(400, 'name is required');
	if (!Array.isArray(ingredients) || ingredients.length === 0) throw error(400, 'At least one ingredient is required');

	const meal = await CustomMeal.create({
		name: name.trim(),
		ingredients,
		createdBy: user.nickname,
	});

	RoundOffCache.deleteMany({ createdBy: user.nickname }).catch(() => {});
	return json(meal.toObject(), { status: 201 });
};

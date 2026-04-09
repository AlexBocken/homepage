import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { CustomMeal } from '$models/CustomMeal';
import { RoundOffCache } from '$models/RoundOffCache';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const meal = await CustomMeal.findById(params.id);
	if (!meal) throw error(404, 'Meal not found');
	if (meal.createdBy !== user.nickname) throw error(403, 'Not authorized');

	const body = await request.json();
	if (body.name !== undefined) {
		if (!body.name?.trim()) throw error(400, 'name cannot be empty');
		meal.name = body.name.trim();
	}
	if (body.ingredients !== undefined) {
		if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) throw error(400, 'At least one ingredient is required');
		meal.ingredients = body.ingredients;
	}

	await meal.save();
	RoundOffCache.deleteMany({ createdBy: user.nickname }).catch(() => {});
	return json(meal.toObject());
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const deleted = await CustomMeal.findOneAndDelete({
		_id: params.id,
		createdBy: user.nickname,
	});
	if (!deleted) throw error(404, 'Meal not found');
	RoundOffCache.deleteMany({ createdBy: user.nickname }).catch(() => {});
	return json({ ok: true });
};

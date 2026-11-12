import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { CustomMeal } from '$models/CustomMeal';
import { findOwnedOr404 } from '$lib/server/ownedResource';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const meal = await findOwnedOr404<any>(CustomMeal, params.id, user.nickname, 'Meal');

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
	return json({ ok: true });
};

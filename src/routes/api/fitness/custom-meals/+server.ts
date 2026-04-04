import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { CustomMeal } from '$models/CustomMeal';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const meals = await CustomMeal.find({ createdBy: user.nickname }).sort({ updatedAt: -1 }).lean();
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

	return json(meal.toObject(), { status: 201 });
};

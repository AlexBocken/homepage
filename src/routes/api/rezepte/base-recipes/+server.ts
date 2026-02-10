import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { json } from '@sveltejs/kit';

// GET: List all base recipes for selector UI
export const GET: RequestHandler = async () => {
	await dbConnect();

	const baseRecipes = await Recipe.find({ isBaseRecipe: true })
		.select('_id short_name name category icon')
		.sort({ name: 1 })
		.lean();

	return json(baseRecipes);
};

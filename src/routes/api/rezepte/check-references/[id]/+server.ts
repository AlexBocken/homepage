import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '../../../../../models/Recipe';
import { dbConnect } from '../../../../../utils/db';
import { json } from '@sveltejs/kit';

// GET: Check which recipes reference this recipe
export const GET: RequestHandler = async ({ params }) => {
	await dbConnect();

	const referencingRecipes = await Recipe.find({
		$or: [
			{ 'ingredients.baseRecipeRef': params.id },
			{ 'instructions.baseRecipeRef': params.id }
		]
	}).select('short_name name').lean();

	return json({
		isReferenced: referencingRecipes.length > 0,
		references: referencingRecipes
	});
};

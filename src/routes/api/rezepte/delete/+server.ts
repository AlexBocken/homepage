import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { UserFavorites } from '$models/UserFavorites';
import { dbConnect } from '$utils/db';
import type {RecipeModelType} from '$types/types';
import { error } from '@sveltejs/kit';
import { invalidateRecipeCaches } from '$lib/server/cache';
// header: use for bearer token for now
// recipe json in body
export const POST: RequestHandler = async ({request, locals}) => {
  	let message = await request.json()

	const auth = await locals.auth();
  	if(!auth) throw error(401, "Need to be logged in")

  	const short_name = message.old_short_name
	await dbConnect();

	// Find the recipe to get its ObjectId before deleting
	const recipe = await Recipe.findOne({short_name: short_name});
	if (!recipe) {
		throw error(404, "Recipe not found");
	}

	// Check if this recipe is referenced by others
	const referencingRecipes = await Recipe.find({
		$or: [
			{ 'ingredients.baseRecipeRef': recipe._id },
			{ 'instructions.baseRecipeRef': recipe._id }
		]
	});

	// Expand all references into regular content before deletion
	for (const depRecipe of referencingRecipes) {
		// Expand ingredient references
		if (depRecipe.ingredients) {
			depRecipe.ingredients = depRecipe.ingredients.flatMap((item: any) => {
				if (item.type === 'reference' && item.baseRecipeRef && item.baseRecipeRef.equals(recipe._id)) {
					if (item.includeIngredients && recipe.ingredients) {
						return recipe.ingredients.filter((i: any) => i.type === 'section' || !i.type);
					}
					return [];
				}
				return [item];
			});
		}

		// Expand instruction references
		if (depRecipe.instructions) {
			depRecipe.instructions = depRecipe.instructions.flatMap((item: any) => {
				if (item.type === 'reference' && item.baseRecipeRef && item.baseRecipeRef.equals(recipe._id)) {
					if (item.includeInstructions && recipe.instructions) {
						return recipe.instructions.filter((i: any) => i.type === 'section' || !i.type);
					}
					return [];
				}
				return [item];
			});
		}

		await depRecipe.save();
	}

	// Remove this recipe from all users' favorites
	await UserFavorites.updateMany(
		{ favorites: recipe._id },
		{ $pull: { favorites: recipe._id } }
	);

	// Delete the recipe
	await Recipe.findOneAndDelete({short_name: short_name});

	// Invalidate recipe caches after successful deletion
	await invalidateRecipeCaches();

	return new Response(JSON.stringify({msg: "Deleted recipe successfully"}),{
		    status: 200,
  	});
}

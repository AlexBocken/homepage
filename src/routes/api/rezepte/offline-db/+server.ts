import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType, RecipeModelType } from '$types/types';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';

export const GET: RequestHandler = async () => {
	await dbConnect();

	// Fetch brief recipes (for lists/filtering)
	// Include images for thumbnail caching during offline sync
	const briefRecipes = await Recipe.find(
		{},
		'name short_name tags category icon description season dateModified images translations'
	).lean() as BriefRecipeType[];

	// Fetch full recipes with populated base recipe references
	const fullRecipes = await Recipe.find({})
		.populate({
			path: 'ingredients.baseRecipeRef',
			select: 'short_name name ingredients translations',
			populate: {
				path: 'ingredients.baseRecipeRef',
				select: 'short_name name ingredients translations',
				populate: {
					path: 'ingredients.baseRecipeRef',
					select: 'short_name name ingredients translations'
				}
			}
		})
		.populate({
			path: 'instructions.baseRecipeRef',
			select: 'short_name name instructions translations',
			populate: {
				path: 'instructions.baseRecipeRef',
				select: 'short_name name instructions translations',
				populate: {
					path: 'instructions.baseRecipeRef',
					select: 'short_name name instructions translations'
				}
			}
		})
		.lean() as RecipeModelType[];

	// Map populated refs to resolvedRecipe field (same as individual item endpoint)
	function mapBaseRecipeRefs(items: any[]): any[] {
		if (!items) return items;
		return items.map((item: any) => {
			if (item.type === 'reference' && item.baseRecipeRef) {
				const resolvedRecipe = { ...item.baseRecipeRef };

				if (resolvedRecipe.ingredients) {
					resolvedRecipe.ingredients = mapBaseRecipeRefs(resolvedRecipe.ingredients);
				}
				if (resolvedRecipe.instructions) {
					resolvedRecipe.instructions = mapBaseRecipeRefs(resolvedRecipe.instructions);
				}

				return { ...item, resolvedRecipe };
			}
			return item;
		});
	}

	const processedFullRecipes = fullRecipes.map((recipe) => {
		const processed = { ...recipe };
		if (processed.ingredients) {
			processed.ingredients = mapBaseRecipeRefs(processed.ingredients);
		}
		if (processed.instructions) {
			processed.instructions = mapBaseRecipeRefs(processed.instructions);
		}
		return processed;
	});

	return json({
		brief: JSON.parse(JSON.stringify(briefRecipes)),
		full: JSON.parse(JSON.stringify(processedFullRecipes)),
		syncedAt: new Date().toISOString()
	});
};

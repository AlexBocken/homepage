import { json, type RequestHandler } from '@sveltejs/kit';
import type { BriefRecipeType, RecipeModelType } from '$types/types';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { recipeMacros } from '$lib/js/recipeMacros';

export const GET: RequestHandler = async () => {
	await dbConnect();

	// Fetch brief and full recipes in parallel
	const [briefRecipes, fullRecipes] = await Promise.all([
		Recipe.find(
			{},
			'name short_name tags category icon description seasonRanges dateModified images translations portions cachedPer100g cachedTotalGrams'
		).lean() as unknown as Promise<BriefRecipeType[]>,
		Recipe.find({})
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
		.lean() as unknown as Promise<RecipeModelType[]>
	]);

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

	// The cached nutrition table is a full micronutrient record per recipe; the
	// listing only needs the macro split, so it is condensed here and the raw
	// table left out of what gets mirrored into IndexedDB.
	const briefWithMacros = briefRecipes.map((recipe) => {
		const { cachedPer100g, cachedTotalGrams, ...rest } = recipe as BriefRecipeType & {
			cachedPer100g?: Parameters<typeof recipeMacros>[0];
			cachedTotalGrams?: number;
		};
		return { ...rest, macros: recipeMacros(cachedPer100g, cachedTotalGrams, recipe.portions) };
	});

	return json({
		brief: briefWithMacros,
		full: processedFullRecipes,
		syncedAt: new Date().toISOString()
	});
};

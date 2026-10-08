import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { markRecipesChanged } from '$lib/server/recipeChanges';
import { generateNutritionMappings } from '$lib/server/nutritionMatcher';
import { requireGroup } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals }) => {
	await requireGroup(locals, 'rezepte_users');
	await dbConnect();

	const recipes = await Recipe.find({}).lean();
	const results: { name: string; mapped: number; total: number }[] = [];

	for (const recipe of recipes) {
		const ingredients = recipe.ingredients || [];
		const translatedIngredients = recipe.translations?.en?.ingredients;

		// Preserve manually edited mappings
		const existingMappings = recipe.nutritionMappings || [];
		const manualMappings = new Map(
			existingMappings
				.filter((m: any) => m.manuallyEdited)
				.map((m: any) => [`${m.sectionIndex}-${m.ingredientIndex}`, m])
		);

		const newMappings = await generateNutritionMappings(ingredients, translatedIngredients);

		const finalMappings = newMappings.map(m => {
			const key = `${m.sectionIndex}-${m.ingredientIndex}`;
			return manualMappings.get(key) || m;
		});

		// Drop the per-100 g cache with the mappings it was summed from; the
		// listing endpoint recalculates it on the next request.
		await Recipe.updateOne(
			{ _id: recipe._id },
			{ $set: { nutritionMappings: finalMappings }, $unset: { cachedPer100g: '', cachedTotalGrams: '' } }
		);

		const mapped = finalMappings.filter(m => m.matchMethod !== 'none').length;
		results.push({ name: recipe.name, mapped, total: finalMappings.length });
	}
	markRecipesChanged();

	const totalMapped = results.reduce((sum, r) => sum + r.mapped, 0);
	const totalIngredients = results.reduce((sum, r) => sum + r.total, 0);

	return json({
		recipes: results.length,
		totalIngredients,
		totalMapped,
		coverage: totalIngredients ? (totalMapped / totalIngredients * 100).toFixed(1) + '%' : '0%',
		details: results,
	});
};

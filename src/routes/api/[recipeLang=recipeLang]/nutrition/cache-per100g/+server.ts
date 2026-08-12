import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { requireGroup } from '$lib/server/middleware/auth';
import { computePer100g } from '$lib/server/recipePer100g';
import { resolveReferences } from '$lib/server/recipeReferences';

export const POST: RequestHandler = async ({ locals }) => {
	await requireGroup(locals, 'rezepte_users');
	await dbConnect();

	const recipes = await Recipe.find({}).select('name short_name ingredients nutritionMappings finalWeight').lean();
	const results: { name: string; shortName: string; calories: number; totalGrams: number }[] = [];
	let skipped = 0;

	for (const recipe of recipes) {
		const references = await resolveReferences(recipe.ingredients || [], recipe.nutritionMappings);
		const result = computePer100g(recipe, references);
		if (!result) {
			// Record the miss rather than leaving the field absent: "computed, and
			// there was nothing usable" is what stops the listing endpoint from
			// retrying this recipe on every cold cache. See items/all_brief.
			await Recipe.updateOne(
				{ _id: recipe._id },
				{ $set: { cachedPer100g: null, cachedTotalGrams: 0 } }
			);
			skipped++;
			continue;
		}

		await Recipe.updateOne(
			{ _id: recipe._id },
			{ $set: { cachedPer100g: result.per100g, cachedTotalGrams: result.totalGrams } }
		);
		results.push({
			name: (recipe as any).name,
			shortName: (recipe as any).short_name,
			calories: Math.round(result.per100g.calories),
			totalGrams: Math.round(result.totalGrams),
		});
	}

	return json({
		updated: results.length,
		skipped,
		total: recipes.length,
		details: results,
	});
};

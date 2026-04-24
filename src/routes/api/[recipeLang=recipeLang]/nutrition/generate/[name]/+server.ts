import { json, error, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { isEnglish } from '$lib/server/recipeHelpers';
import { generateNutritionMappings } from '$lib/server/nutritionMatcher';

export const POST: RequestHandler = async ({ params, locals, url }) => {
	locals.session ?? await locals.auth();
	await dbConnect();

	const en = isEnglish(params.recipeLang!);
	const query = en
		? { 'translations.en.short_name': params.name }
		: { short_name: params.name };

	const recipe = await Recipe.findOne(query).lean();
	if (!recipe) throw error(404, 'Recipe not found');

	const ingredients = recipe.ingredients || [];
	const translatedIngredients = recipe.translations?.en?.ingredients;

	const newMappings = await generateNutritionMappings(ingredients, translatedIngredients);
	const preview = url.searchParams.get('preview') === 'true';

	// In preview mode, return pure auto-matches without saving (client merges manual edits)
	if (preview) {
		return json({ mappings: newMappings, count: newMappings.length });
	}

	// Preserve manually edited mappings
	const existingMappings = recipe.nutritionMappings || [];
	const manualMappings = new Map(
		existingMappings
			.filter((m: any) => m.manuallyEdited)
			.map((m: any) => [`${m.sectionIndex}-${m.ingredientIndex}`, m])
	);

	// Merge: keep manual edits, use new auto-matches for the rest
	const finalMappings = newMappings.map(m => {
		const key = `${m.sectionIndex}-${m.ingredientIndex}`;
		return manualMappings.get(key) || m;
	});

	await Recipe.updateOne(
		{ _id: recipe._id },
		{ $set: { nutritionMappings: finalMappings } }
	);

	return json({ mappings: finalMappings, count: finalMappings.length });
};

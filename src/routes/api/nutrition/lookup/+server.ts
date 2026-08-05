import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';
import { Recipe } from '$models/Recipe';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { CustomMeal } from '$models/CustomMeal';
import { dbConnect } from '$utils/db';
import { computePer100g } from '$lib/server/recipePer100g';
import { resolveReferences } from '$lib/server/recipeReferences';
import { offPortions } from '$lib/server/offPortions';
import { fetchFromOffApi, cacheOffProduct } from '$lib/server/offLookup';
import { offPer100gToAppUnits } from '$lib/fitness/offUnits';
import { resolveMeal } from '$lib/server/foodLogComponents';
import { customMealPortions } from '$lib/fitness/portions';

export const GET: RequestHandler = async ({ url }) => {
	const source = url.searchParams.get('source');
	const id = url.searchParams.get('id');

	if (!source || !id) {
		return json({ error: 'source and id are required' }, { status: 400 });
	}

	if (source === 'bls') {
		const entry = BLS_DB.find(e => e.blsCode === id);
		if (!entry) return json({ error: 'Not found' }, { status: 404 });
		return json({ per100g: entry.per100g });
	}

	if (source === 'usda') {
		const fdcId = Number(id);
		const entry = NUTRITION_DB.find(e => e.fdcId === fdcId);
		if (!entry) return json({ error: 'Not found' }, { status: 404 });
		return json({ per100g: entry.per100g, portions: entry.portions });
	}

	if (source === 'recipe') {
		await dbConnect();
		const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { short_name: id };
		const recipe = await Recipe.findOne(query)
			.select('ingredients nutritionMappings portions')
			.lean();
		if (!recipe) return json({ error: 'Not found' }, { status: 404 });

		const mappings = recipe.nutritionMappings || [];
		const ingredients = recipe.ingredients || [];

		// A base recipe used to contribute its nutrients but not its weight, so
		// every per-100 g figure for a recipe with one came out too high — the
		// dough's calories over the toppings' grams.
		const references = await resolveReferences(ingredients, mappings);
		const result = computePer100g(recipe, references);
		const per100g: Record<string, number> = result?.per100g ?? {};
		const totalWeightGrams = result?.totalGrams ?? 0;

		const portions: any[] = [];
		const portionsMatch = recipe.portions?.match(/^(\d+(?:[.,]\d+)?)/);
		const portionCount = portionsMatch ? parseFloat(portionsMatch[1].replace(',', '.')) : 0;
		if (portionCount > 0 && totalWeightGrams > 0) {
			portions.push({ description: '1 Portion', grams: Math.round(totalWeightGrams / portionCount) });
		}

		return json({ per100g, ...(portions.length > 0 && { portions }) });
	}

	if (source === 'off') {
		await dbConnect();
		const entry = await OpenFoodFact.findOne({ barcode: id }).lean();
		if (entry) {
			const portions = offPortions(entry);
			return json({
				// Stored in OFF's grams-for-everything convention; converted on read.
				per100g: offPer100gToAppUnits(entry.per100g as Record<string, number>),
				...(portions.length > 0 && { portions }),
			});
		}
		// Not cached yet — resolve it live, same as the barcode endpoint does. Without
		// this an OFF food that isn't in the local mirror 404s here, which the client
		// surfaces as "Could not load food data" even though the product is resolvable.
		const live = await fetchFromOffApi(id);
		if (!live) return json({ error: 'Not found' }, { status: 404 });
		await cacheOffProduct(live, id);
		return json({
			per100g: live.per100g,
			...(live.portions.length > 0 && { portions: live.portions }),
		});
	}

	if (source === 'custom') {
		await dbConnect();
		const meal = await CustomMeal.findById(id).lean();
		if (!meal) return json({ error: 'Not found' }, { status: 404 });

		// Ingredients are references; resolve them live and blend.
		const { per100g, totalGrams } = await resolveMeal(meal);
		const portions = customMealPortions(meal.name, totalGrams);
		return json({ per100g, ...(portions.length > 0 && { portions }) });
	}

	return json({ error: 'Invalid source' }, { status: 400 });
};

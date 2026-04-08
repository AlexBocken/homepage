import { json, type RequestHandler } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { computeRecipeNutritionTotals, parseAmount, resolveReferencedNutrition } from '$lib/server/nutritionMatcher';

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

		const totals = computeRecipeNutritionTotals(ingredients, mappings, 1);

		const referencedNutrition = await resolveReferencedNutrition(ingredients, mappings);
		for (const ref of referencedNutrition) {
			const mult = ref.baseMultiplier ?? 1;
			for (const [k, v] of Object.entries(ref.nutrition)) {
				if (typeof v === 'number') {
					totals[k] = (totals[k] || 0) + v * mult;
				}
			}
		}

		const mappingIndex = new Map(
			mappings.map((m: any) => [`${m.sectionIndex}-${m.ingredientIndex}`, m])
		);
		let totalWeightGrams = 0;
		for (let si = 0; si < ingredients.length; si++) {
			const section = ingredients[si];
			if (section.type === 'reference' || !section.list) continue;
			for (let ii = 0; ii < section.list.length; ii++) {
				const item = section.list[ii];
				if (/<a\s/i.test(item.name || '')) continue;
				const mapping = mappingIndex.get(`${si}-${ii}`);
				if (!mapping || mapping.matchMethod === 'none' || mapping.excluded) continue;
				const amount = parseAmount(item.amount || '') || (mapping.defaultAmountUsed ? 1 : 0);
				totalWeightGrams += amount * (mapping.gramsPerUnit || 0);
			}
		}

		const per100g: Record<string, number> = {};
		if (totalWeightGrams > 0) {
			for (const [k, v] of Object.entries(totals)) {
				per100g[k] = (v / totalWeightGrams) * 100;
			}
		} else {
			Object.assign(per100g, totals);
		}

		const portions: any[] = [];
		const portionsMatch = recipe.portions?.match(/^(\d+(?:[.,]\d+)?)/);
		const portionCount = portionsMatch ? parseFloat(portionsMatch[1].replace(',', '.')) : 0;
		if (portionCount > 0 && totalWeightGrams > 0) {
			portions.push({ description: '1 Portion', grams: Math.round(totalWeightGrams / portionCount) });
		}

		return json({ per100g, ...(portions.length > 0 && { portions }) });
	}

	return json({ error: 'Invalid source' }, { status: 400 });
};

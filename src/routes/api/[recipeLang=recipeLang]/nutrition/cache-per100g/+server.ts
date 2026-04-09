import { json, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { requireGroup } from '$lib/server/middleware/auth';
import { getBlsEntryByCode, getNutritionEntryByFdcId } from '$lib/server/nutritionMatcher';

const KEYS = [
	'calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars',
	'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
	'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
	'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate', 'cholesterol',
];

function parseAmount(amount: string | undefined): number {
	if (!amount?.trim()) return 0;
	const s = amount.trim().replace(',', '.');
	const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
	if (rangeMatch) return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
	const fractionMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
	if (fractionMatch) return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
	const parsed = parseFloat(s);
	return isNaN(parsed) ? 0 : parsed;
}

function computePer100g(recipe: any): { per100g: Record<string, number>; totalGrams: number } | null {
	const mappings = recipe.nutritionMappings;
	if (!mappings?.length) return null;

	const totals: Record<string, number> = {};
	for (const k of KEYS) totals[k] = 0;
	let totalGrams = 0;

	for (const m of mappings) {
		if (m.matchMethod === 'none' || m.excluded || !m.gramsPerUnit) continue;

		let per100g = m.per100g;
		if (!per100g) {
			if (m.source === 'bls' && m.blsCode) {
				per100g = getBlsEntryByCode(m.blsCode)?.per100g;
			} else if (m.fdcId) {
				per100g = getNutritionEntryByFdcId(m.fdcId)?.per100g;
			}
		}
		if (!per100g) continue;

		const section = recipe.ingredients?.[m.sectionIndex];
		const items = section?.list ?? section?.ingredients ?? section?.items ?? [];
		const ing = items[m.ingredientIndex];
		const parsedAmount = (ing ? parseAmount(ing.amount) : 0) || (m.defaultAmountUsed ? 1 : 0);

		const grams = parsedAmount * m.gramsPerUnit;
		totalGrams += grams;
		const factor = grams / 100;
		for (const k of KEYS) totals[k] += factor * ((per100g as any)[k] ?? 0);
	}

	if (totalGrams <= 0) return null;

	const per100g: Record<string, number> = {};
	for (const k of KEYS) per100g[k] = totals[k] / totalGrams * 100;
	return { per100g, totalGrams };
}

export const POST: RequestHandler = async ({ locals }) => {
	await requireGroup(locals, 'rezepte_users');
	await dbConnect();

	const recipes = await Recipe.find({}).select('name short_name ingredients nutritionMappings').lean();
	const results: { name: string; shortName: string; calories: number; totalGrams: number }[] = [];
	let skipped = 0;

	for (const recipe of recipes) {
		const result = computePer100g(recipe);
		if (!result) {
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

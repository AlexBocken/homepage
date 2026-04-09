import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { BLS_DB } from '$lib/data/blsDb';
import { DRI_MALE } from '$lib/data/dailyReferenceIntake';
import { Recipe } from '$models/Recipe';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { CustomMeal } from '$models/CustomMeal';
import { dbConnect } from '$utils/db';
import { computeRecipeNutritionTotals, resolvePer100g, parseAmount, resolveReferencedNutrition } from '$lib/server/nutritionMatcher';
import { FoodLogEntry } from '$models/FoodLogEntry';

async function computeRecipePer100g(id: string): Promise<Record<string, number>> {
	const recipeQuery = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { short_name: id };
	const recipe = await Recipe.findOne(recipeQuery)
		.select('ingredients nutritionMappings')
		.lean();
	if (!recipe) return {};

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
	return per100g;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const { source, id } = params;

	if (source !== 'bls' && source !== 'usda' && source !== 'recipe' && source !== 'off' && source !== 'custom') {
		throw error(404, 'Invalid source');
	}

	if (source === 'bls') {
		const entry = BLS_DB.find(e => e.blsCode === id);
		if (!entry) throw error(404, 'Food not found');
		return {
			food: {
				source: 'bls' as const,
				id: entry.blsCode,
				name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
				nameDe: entry.nameDe,
				nameEn: entry.nameEn,
				category: entry.category,
				per100g: entry.per100g,
			},
			dri: DRI_MALE,
		};
	}

	if (source === 'recipe') {
		await dbConnect();
		// sourceId may be a MongoDB ObjectId or a short_name
		const recipeQuery = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { short_name: id };
		const recipe = await Recipe.findOne(recipeQuery)
			.select('short_name name translations images')
			.lean();
		if (!recipe) throw error(404, 'Recipe not found');

		// Use logged per100g from food diary entry if provided, otherwise compute from current recipe
		const logEntryId = url.searchParams.get('logEntry');
		let per100g: Record<string, number>;

		if (logEntryId) {
			const logEntry = await FoodLogEntry.findById(logEntryId).select('per100g').lean();
			if (logEntry?.per100g) {
				per100g = logEntry.per100g as unknown as Record<string, number>;
			} else {
				per100g = await computeRecipePer100g(id);
			}
		} else {
			per100g = await computeRecipePer100g(id);
		}

		const nameEn = recipe.translations?.en?.name;
		const image = (recipe.images as any[])?.[0]?.mediapath || `${recipe.short_name}.webp`;

		return {
			food: {
				source: 'recipe' as const,
				id: recipe.short_name,
				name: recipe.name,
				nameDe: recipe.name,
				nameEn: nameEn || undefined,
				category: 'Rezept',
				per100g,
				recipeSlug: recipe.short_name,
				recipeSlugEn: recipe.translations?.en?.short_name || undefined,
				image,
			},
			dri: DRI_MALE,
		};
	}

	if (source === 'off') {
		await dbConnect();
		const entry = await OpenFoodFact.findOne({ barcode: id }).lean();
		if (!entry) throw error(404, 'Food not found');
		const portions: { description: string; grams: number }[] = [];
		if (entry.serving?.grams) {
			portions.push(entry.serving as { description: string; grams: number });
		}
		return {
			food: {
				source: 'off' as const,
				id: entry.barcode,
				name: entry.nameDe || entry.name,
				nameDe: entry.nameDe,
				nameEn: entry.nameDe ? entry.name : undefined,
				category: entry.category || '',
				per100g: entry.per100g as unknown as Record<string, number>,
				brands: entry.brands,
				nutriscore: entry.nutriscore,
				portions,
			},
			dri: DRI_MALE,
		};
	}

	if (source === 'custom') {
		await dbConnect();
		const meal = await CustomMeal.findById(id).lean();
		if (!meal) throw error(404, 'Meal not found');

		// Aggregate per100g from ingredients
		const totals: Record<string, number> = {};
		let totalGrams = 0;
		for (const ing of meal.ingredients) {
			const r = ing.amountGrams / 100;
			totalGrams += ing.amountGrams;
			for (const [k, v] of Object.entries(ing.per100g)) {
				if (typeof v === 'number') {
					totals[k] = (totals[k] || 0) + v * r;
				}
			}
		}
		const per100g: Record<string, number> = {};
		const scale = totalGrams > 0 ? 100 / totalGrams : 0;
		for (const [k, v] of Object.entries(totals)) {
			per100g[k] = v * scale;
		}

		// Use logged per100g snapshot if provided
		const logEntryId = url.searchParams.get('logEntry');
		if (logEntryId) {
			const logEntry = await FoodLogEntry.findById(logEntryId).select('per100g').lean();
			if (logEntry?.per100g) {
				Object.assign(per100g, logEntry.per100g);
			}
		}

		return {
			food: {
				source: 'custom' as const,
				id: String(meal._id),
				name: meal.name,
				category: 'Custom Meal',
				per100g,
				totalGrams,
				ingredients: meal.ingredients.map((ing: any) => ({
					name: ing.name,
					source: ing.source,
					sourceId: ing.sourceId,
					amountGrams: ing.amountGrams,
					calories: (ing.per100g?.calories ?? 0) * ing.amountGrams / 100,
					protein: (ing.per100g?.protein ?? 0) * ing.amountGrams / 100,
					fat: (ing.per100g?.fat ?? 0) * ing.amountGrams / 100,
					carbs: (ing.per100g?.carbs ?? 0) * ing.amountGrams / 100,
				})),
			},
			dri: DRI_MALE,
		};
	}

	// USDA
	const fdcId = Number(id);
	const entry = NUTRITION_DB.find(e => e.fdcId === fdcId);
	if (!entry) throw error(404, 'Food not found');
	return {
		food: {
			source: 'usda' as const,
			id: String(entry.fdcId),
			name: entry.name,
			category: entry.category,
			per100g: entry.per100g,
			portions: entry.portions,
		},
		dri: DRI_MALE,
	};
};

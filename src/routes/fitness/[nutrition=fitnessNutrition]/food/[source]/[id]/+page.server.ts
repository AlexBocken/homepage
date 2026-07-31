import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { resolveBarcodeOverride } from '$lib/server/barcodeOverrides';
import { NUTRITION_DB } from '$lib/data/nutritionDb';
import { usdaDisplayName, usdaNameDe } from '$lib/data/usdaNamesDe';
import { BLS_DB } from '$lib/data/blsDb';
import { getDRI } from '$lib/data/dailyReferenceIntake';
import { Recipe } from '$models/Recipe';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { CustomMeal } from '$models/CustomMeal';
import { dbConnect } from '$utils/db';
import { computeRecipeNutritionTotals, resolvePer100g, parseAmount, resolveReferencedNutrition } from '$lib/server/nutritionMatcher';
import { scaleFromPer100g } from '$lib/fitness/nutritionMath';
import { offPortions } from '$lib/server/offPortions';
import { offPer100gToAppUnits } from '$lib/fitness/offUnits';
import { resolveEntries, resolveMeal } from '$lib/server/foodLogComponents';
import { customMealPortions } from '$lib/fitness/portions';
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

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const { source, id } = params;

	if (source !== 'bls' && source !== 'usda' && source !== 'recipe' && source !== 'off' && source !== 'custom') {
		await errorWithVerse(fetch, url.pathname, 404, 'Invalid source');
	}

	// Reference intakes are sex-specific (iron, for one, differs by a factor of two),
	// and the WHO amino acid requirements are per kg of body weight — so both come
	// from the user's own goal/measurements, with the generic adult as the fallback.
	const [goalRes, weightRes] = await Promise.all([
		fetch('/api/fitness/goal'),
		fetch('/api/fitness/measurements/latest'),
	]);
	const goal = goalRes.ok ? await goalRes.json() : {};
	const latestWeight = weightRes.ok ? await weightRes.json() : {};
	// The fatty acid references are shares of energy, so they follow the calorie goal
	// where one is set — same rule as the diary and the stats page.
	const dri = getDRI(goal?.sex === 'female' ? 'female' : 'male', goal?.dailyCalories ?? null);
	const bodyWeight: number | null = latestWeight?.weight?.value ?? null;

	if (source === 'bls') {
		const entry = BLS_DB.find(e => e.blsCode === id);
		if (!entry) {
			await errorWithVerse(fetch, url.pathname, 404, 'Food not found');
			throw new Error('unreachable');
		}
		return {
			food: {
				source: 'bls' as const,
				id: entry.blsCode,
				name: `${entry.nameDe}${entry.nameEn ? ` (${entry.nameEn})` : ''}`,
				nameDe: entry.nameDe,
				nameEn: entry.nameEn,
				// BLS is a German source, so German leads and English is the subtitle.
				namePrimary: entry.nameDe,
				nameSecondary: entry.nameEn || undefined,
				category: entry.category,
				per100g: entry.per100g,
			},
			dri,
			bodyWeight,
		};
	}

	if (source === 'recipe') {
		await dbConnect();
		// sourceId may be a MongoDB ObjectId or a short_name
		const recipeQuery = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { short_name: id };
		const recipe = await Recipe.findOne(recipeQuery)
			.select('short_name name translations images')
			.lean();
		if (!recipe) {
			await errorWithVerse(fetch, url.pathname, 404, 'Recipe not found');
			throw new Error('unreachable');
		}

		// Use logged per100g from food diary entry if provided, otherwise compute from current recipe
		const logEntryId = url.searchParams.get('logEntry');
		let per100g: Record<string, number>;

		if (logEntryId) {
			// The entry stores references; resolve it to the blended nutrition it works
			// out to now (a base-table fix since logging is reflected here too).
			const logEntry = await FoodLogEntry.findById(logEntryId).lean();
			if (logEntry) {
				const [hydrated] = await resolveEntries([logEntry as any]);
				per100g = hydrated.per100g;
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
			dri,
			bodyWeight,
		};
	}

	if (source === 'off') {
		await dbConnect();
		// A mapped barcode belongs on its BLS/USDA page — redirect rather than
		// render, so the URL matches the record actually being shown and links
		// people copy stay correct.
		const override = await resolveBarcodeOverride(id);
		if (override) {
			redirect(307, `/${params.nutrition}/food/${override.source}/${encodeURIComponent(override.id)}`);
		}
		const entry = await OpenFoodFact.findOne({ barcode: id }).lean();
		if (!entry) {
			await errorWithVerse(fetch, url.pathname, 404, 'Food not found');
			throw new Error('unreachable');
		}
		return {
			food: {
				source: 'off' as const,
				id: entry.barcode,
				name: entry.nameDe || entry.name,
				nameDe: entry.nameDe,
				nameEn: entry.nameDe ? entry.name : undefined,
				category: entry.category || '',
				// Stored in OFF's grams-for-everything convention; converted on read.
				per100g: offPer100gToAppUnits(entry.per100g as unknown as Record<string, number>),
				brands: entry.brands,
				nutriscore: entry.nutriscore,
				portions: offPortions(entry),
			},
			dri,
			bodyWeight,
		};
	}

	if (source === 'custom') {
		await dbConnect();
		const meal = await CustomMeal.findById(id).lean();
		if (!meal) {
			await errorWithVerse(fetch, url.pathname, 404, 'Meal not found');
			throw new Error('unreachable');
		}

		// Ingredients are references; resolve them live, keeping the per-ingredient
		// figures for the breakdown list and the blend for the meal total.
		const { ingredients: resolvedIngredients, totalGrams, per100g } = await resolveMeal(meal);

		// Show the meal as it was actually logged, if opened from a diary entry — its
		// components resolved to today's tables.
		const logEntryId = url.searchParams.get('logEntry');
		if (logEntryId) {
			const logEntry = await FoodLogEntry.findById(logEntryId).lean();
			if (logEntry) {
				const [hydrated] = await resolveEntries([logEntry as any]);
				Object.assign(per100g, hydrated.per100g);
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
				portions: customMealPortions(meal.name, totalGrams),
				ingredients: meal.ingredients.map((ing: any, i: number) => {
					const p = resolvedIngredients[i]?.per100g ?? {};
					return {
						name: ing.name,
						source: ing.source,
						sourceId: ing.sourceId,
						amountGrams: ing.amountGrams,
						calories: scaleFromPer100g(p.calories, ing.amountGrams),
						protein: scaleFromPer100g(p.protein, ing.amountGrams),
						fat: scaleFromPer100g(p.fat, ing.amountGrams),
						carbs: scaleFromPer100g(p.carbs, ing.amountGrams),
					};
				}),
			},
			dri,
			bodyWeight,
		};
	}

	// USDA
	const fdcId = Number(id);
	const entry = NUTRITION_DB.find(e => e.fdcId === fdcId);
	if (!entry) {
		await errorWithVerse(fetch, url.pathname, 404, 'Food not found');
		throw new Error('unreachable');
	}
	return {
		food: {
			source: 'usda' as const,
			id: String(entry.fdcId),
			name: usdaDisplayName(entry.name),
			nameEn: entry.name,
			nameDe: usdaNameDe(entry.name),
			// USDA is an English source — the mirror of BLS: English leads, German follows.
			namePrimary: entry.name,
			nameSecondary: usdaNameDe(entry.name),
			category: entry.category,
			per100g: entry.per100g,
			portions: entry.portions,
		},
		dri,
		bodyWeight,
	};
};

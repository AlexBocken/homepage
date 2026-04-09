import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { BLS_DB } from '$lib/data/blsDb';
import { getBlsEntryByCode, getNutritionEntryByFdcId } from '$lib/server/nutritionMatcher';
import { Recipe } from '$models/Recipe';
import { CustomMeal } from '$models/CustomMeal';
import { FavoriteIngredient } from '$models/FavoriteIngredient';
import { FoodLogEntry } from '$models/FoodLogEntry';
import { OpenFoodFact } from '$models/OpenFoodFact';
import { RoundOffCache } from '$models/RoundOffCache';
import { PANTRY_FOODS } from '$lib/server/pantryFoods';
import {
	findBestCombos,
	type RemainingBudget,
	type ResolvedFood,
	type ComboSuggestion,
} from '$lib/server/roundOffScoring';

// Build a lookup map once on module load
const blsByCode = new Map<string, (typeof BLS_DB)[0]>();
for (const entry of BLS_DB) {
	blsByCode.set(entry.blsCode, entry);
}

// Resolve pantry foods to per100g data (cached on module load)
const resolvedPantry: ResolvedFood[] = [];
for (const item of PANTRY_FOODS) {
	const entry = blsByCode.get(item.blsCode);
	if (!entry) continue;
	const p = entry.per100g as any;
	resolvedPantry.push({
		source: 'bls',
		id: item.blsCode,
		name: item.name,
		nameEn: item.nameEn,
		per100g: {
			calories: p.calories ?? 0,
			protein: p.protein ?? 0,
			fat: p.fat ?? 0,
			carbs: p.carbs ?? 0,
		},
		group: item.group,
	});
}

/**
 * Resolve favorites + recents to ResolvedFood entries.
 */
async function resolveFavoritesAndRecents(nickname: string): Promise<ResolvedFood[]> {
	const foods: ResolvedFood[] = [];
	const seen = new Set<string>();

	// Favorites
	const favDocs = await FavoriteIngredient.find({ createdBy: nickname }).lean();
	for (const fav of favDocs) {
		const key = `${fav.source}:${fav.sourceId}`;
		if (seen.has(key)) continue;
		seen.add(key);

		let per100g: Record<string, number> | null = null;
		if (fav.source === 'bls') {
			const entry = getBlsEntryByCode(fav.sourceId);
			if (entry) per100g = entry.per100g as unknown as Record<string, number>;
		} else if (fav.source === 'usda') {
			const entry = getNutritionEntryByFdcId(Number(fav.sourceId));
			if (entry) per100g = entry.per100g as unknown as Record<string, number>;
		} else if (fav.source === 'off') {
			const entry = await OpenFoodFact.findOne({ barcode: fav.sourceId }).lean();
			if (entry) per100g = entry.per100g as unknown as Record<string, number>;
		}
		if (per100g && (per100g.calories ?? 0) > 5) {
			foods.push({
				source: fav.source,
				id: fav.sourceId,
				name: fav.name,
				nameEn: fav.name,
				per100g: {
					calories: per100g.calories ?? 0,
					protein: per100g.protein ?? 0,
					fat: per100g.fat ?? 0,
					carbs: per100g.carbs ?? 0,
				},
			});
		}
	}

	// Recents (last 3 days)
	const recentFrom = new Date();
	recentFrom.setDate(recentFrom.getDate() - 3);
	const recentEntries = await FoodLogEntry.find({
		createdBy: nickname,
		date: { $gte: recentFrom },
		mealType: { $ne: 'water' },
		source: { $exists: true },
		sourceId: { $exists: true, $ne: '' },
		per100g: { $exists: true },
	}).sort({ date: -1 }).lean();

	for (const entry of recentEntries as any[]) {
		const key = `${entry.source}:${entry.sourceId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		if (!entry.per100g || (entry.per100g.calories ?? 0) <= 5) continue;
		foods.push({
			source: entry.source,
			id: entry.sourceId,
			name: entry.name,
			nameEn: entry.name,
			per100g: {
				calories: entry.per100g.calories ?? 0,
				protein: entry.per100g.protein ?? 0,
				fat: entry.per100g.fat ?? 0,
				carbs: entry.per100g.carbs ?? 0,
			},
		});
	}

	return foods;
}

/** Check if cached remaining values are within ±5% of requested */
function cacheMatchesParams(
	cached: { remainingKcal: number; remainingProtein: number; remainingFat: number; remainingCarbs: number },
	req: RemainingBudget,
): boolean {
	const close = (a: number, b: number) => {
		if (b === 0) return Math.abs(a) < 5;
		return Math.abs(a - b) / Math.max(Math.abs(b), 1) <= 0.05;
	};
	return close(cached.remainingKcal, req.kcal)
		&& close(cached.remainingProtein, req.protein)
		&& close(cached.remainingFat, req.fat)
		&& close(cached.remainingCarbs, req.carbs);
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);

	const remainingKcal = Number(url.searchParams.get('remainingKcal'));
	const remainingProtein = Number(url.searchParams.get('remainingProtein'));
	const remainingFat = Number(url.searchParams.get('remainingFat'));
	const remainingCarbs = Number(url.searchParams.get('remainingCarbs'));
	const limit = Math.min(Number(url.searchParams.get('limit')) || 12, 30);

	if (isNaN(remainingKcal) || remainingKcal <= 0) {
		throw error(400, 'remainingKcal must be a positive number');
	}

	const remaining: RemainingBudget = {
		kcal: remainingKcal,
		protein: remainingProtein || 0,
		fat: remainingFat || 0,
		carbs: remainingCarbs || 0,
	};

	await dbConnect();

	const today = new Date().toISOString().slice(0, 10);

	// Check cache (validate shape: new schema has items array)
	const cached = await RoundOffCache.findOne({ createdBy: user.nickname, date: today }).lean();
	if (cached && cached.suggestions?.[0]?.items && cacheMatchesParams(cached, remaining)) {
		return json({
			suggestions: cached.suggestions.slice(0, limit),
			foodPoolCount: cached.foodPoolCount,
			recipeCount: cached.recipeCount,
		});
	}

	// 1. Resolve user's favorites + recents
	const userFoods = await resolveFavoritesAndRecents(user.nickname);

	// 2. Combine pantry + user foods (deduplicate by source:id)
	const allFoodsSeen = new Set<string>();
	const allFoods: ResolvedFood[] = [];
	// User foods first (so they take priority in dedup)
	for (const f of userFoods) {
		const key = `${f.source}:${f.id}`;
		if (allFoodsSeen.has(key)) continue;
		allFoodsSeen.add(key);
		allFoods.push(f);
	}
	for (const f of resolvedPantry) {
		const key = `${f.source}:${f.id}`;
		if (allFoodsSeen.has(key)) continue;
		allFoodsSeen.add(key);
		allFoods.push(f);
	}

	// 3. Resolve custom meals and add to food pool
	const customMeals = await CustomMeal.find({ createdBy: user.nickname }).lean();
	for (const meal of customMeals as any[]) {
		if (!meal.ingredients?.length) continue;
		let totalGrams = 0;
		let totalCal = 0, totalP = 0, totalF = 0, totalC = 0;
		for (const ing of meal.ingredients) {
			const g = ing.amountGrams ?? 100;
			totalGrams += g;
			const f = g / 100;
			totalCal += (ing.per100g?.calories ?? 0) * f;
			totalP += (ing.per100g?.protein ?? 0) * f;
			totalF += (ing.per100g?.fat ?? 0) * f;
			totalC += (ing.per100g?.carbs ?? 0) * f;
		}
		if (totalGrams <= 0 || totalCal <= 5) continue;
		const key = `custom:${meal._id}`;
		if (allFoodsSeen.has(key)) continue;
		allFoodsSeen.add(key);
		allFoods.push({
			source: 'custom',
			id: String(meal._id),
			name: meal.name,
			nameEn: meal.name,
			per100g: {
				calories: totalCal / totalGrams * 100,
				protein: totalP / totalGrams * 100,
				fat: totalF / totalGrams * 100,
				carbs: totalC / totalGrams * 100,
			},
		});
	}

	// 4. Find best combos (1-3 foods)
	const foodCombos = findBestCombos(allFoods, remaining, 'pantry', limit * 2);

	// 5. Find best recipes (single items only, no combos)
	const recipes = await Recipe.find(
		{ cachedPer100g: { $exists: true, $ne: null } },
		{ name: 1, short_name: 1, cachedPer100g: 1, cachedTotalGrams: 1, portions: 1 }
	).lean();

	const resolvedRecipes: ResolvedFood[] = [];
	for (const r of recipes as any[]) {
		const p = r.cachedPer100g;
		if (!p || !p.calories) continue;
		resolvedRecipes.push({
			source: 'recipe',
			id: r.short_name || String(r._id),
			name: r.name,
			nameEn: r.name,
			per100g: {
				calories: p.calories ?? 0,
				protein: p.protein ?? 0,
				fat: p.fat ?? 0,
				carbs: p.carbs ?? 0,
			},
		});
	}

	const recipeCombos = findBestCombos(resolvedRecipes, remaining, 'recipe', limit, 1);

	// 6. Merge and sort by score (lower = better)
	const all: ComboSuggestion[] = [...foodCombos, ...recipeCombos];
	all.sort((a, b) => a.score - b.score);
	const suggestions = all.slice(0, limit);

	// 7. Store in cache
	await RoundOffCache.findOneAndUpdate(
		{ createdBy: user.nickname, date: today },
		{
			remainingKcal,
			remainingProtein: remainingProtein || 0,
			remainingFat: remainingFat || 0,
			remainingCarbs: remainingCarbs || 0,
			suggestions,
			foodPoolCount: allFoods.length,
			recipeCount: resolvedRecipes.length,
			computedAt: new Date(),
		},
		{ upsert: true },
	);

	return json({
		suggestions,
		foodPoolCount: allFoods.length,
		recipeCount: resolvedRecipes.length,
	});
};

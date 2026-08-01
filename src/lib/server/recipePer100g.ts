/**
 * Per-100 g nutrition for a whole recipe, summed from its ingredient mappings.
 *
 * Deliberately does NOT import $lib/server/nutritionMatcher: that module pulls
 * in @huggingface/transformers for embedding-based matching, which has no place
 * in a listing request. Only the two lookup tables are needed here, and a
 * mapping already carries the code that identifies its row.
 */
import { NUTRITION_DB, type NutritionEntry } from '$lib/data/nutritionDb';
import { BLS_DB, type BlsEntry } from '$lib/data/blsDb';
import type { NutritionPer100g } from '$types/types';

let blsByCode: Map<string, BlsEntry> | null = null;
let usdaByFdcId: Map<number, NutritionEntry> | null = null;

function getBlsByCode(): Map<string, BlsEntry> {
	if (!blsByCode) blsByCode = new Map(BLS_DB.map((e) => [e.blsCode, e]));
	return blsByCode;
}

function getUsdaByFdcId(): Map<number, NutritionEntry> {
	if (!usdaByFdcId) usdaByFdcId = new Map(NUTRITION_DB.map((e) => [e.fdcId, e]));
	return usdaByFdcId;
}

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

function resolvePer100g(m: {
	per100g?: NutritionPer100g;
	source?: string;
	blsCode?: string;
	fdcId?: number;
}): NutritionPer100g | undefined {
	if (m.per100g) return m.per100g;
	if (m.source === 'bls' && m.blsCode) return getBlsByCode().get(m.blsCode)?.per100g;
	if (m.fdcId) return getUsdaByFdcId().get(m.fdcId)?.per100g;
	return undefined;
}

export type Per100gResult = { per100g: Record<string, number>; totalGrams: number };

/**
 * Sum every numeric key the ingredients carry, amino acids included. A fixed
 * list silently drops what it omits, and this result is *cached onto the
 * recipe*, so anything missed stays missing until the cache is rebuilt.
 *
 * Returns null when the recipe has no usable mappings — an unmapped recipe, or
 * one whose every ingredient was excluded.
 */
export function computePer100g(recipe: {
	nutritionMappings?: any[];
	ingredients?: any[];
}): Per100gResult | null {
	const mappings = recipe.nutritionMappings;
	if (!mappings?.length) return null;

	const totals: Record<string, number> = {};
	let totalGrams = 0;

	for (const m of mappings) {
		if (m.matchMethod === 'none' || m.excluded || !m.gramsPerUnit) continue;

		const per100g = resolvePer100g(m);
		if (!per100g) continue;

		const section = recipe.ingredients?.[m.sectionIndex];
		const items = section?.list ?? section?.ingredients ?? section?.items ?? [];
		const ing = items[m.ingredientIndex];
		const parsedAmount = (ing ? parseAmount(ing.amount) : 0) || (m.defaultAmountUsed ? 1 : 0);

		const grams = parsedAmount * m.gramsPerUnit;
		totalGrams += grams;
		const factor = grams / 100;
		for (const [k, v] of Object.entries(per100g as Record<string, unknown>)) {
			if (typeof v === 'number') totals[k] = (totals[k] ?? 0) + factor * v;
		}
	}

	if (totalGrams <= 0) return null;

	const per100g: Record<string, number> = {};
	for (const [k, v] of Object.entries(totals)) per100g[k] = (v / totalGrams) * 100;
	return { per100g, totalGrams };
}

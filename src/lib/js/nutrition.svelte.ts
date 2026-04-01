/**
 * Reactive nutrition calculator factory for recipe calorie/macro display.
 * Uses Svelte 5 runes ($state/$derived) with the factory pattern.
 *
 * Import without .ts extension: import { createNutritionCalculator } from '$lib/js/nutrition.svelte'
 *
 * NOTE: Does NOT import the full NUTRITION_DB — all per100g data comes pre-resolved
 * in the NutritionMapping objects from the API to keep client bundle small.
 */
import type { NutritionMapping } from '$types/types';

export type MacroTotals = {
	calories: number;
	protein: number;
	fat: number;
	saturatedFat: number;
	carbs: number;
	fiber: number;
	sugars: number;
};

export type MicroTotals = {
	calcium: number;
	iron: number;
	magnesium: number;
	phosphorus: number;
	potassium: number;
	sodium: number;
	zinc: number;
	vitaminA: number;
	vitaminC: number;
	vitaminD: number;
	vitaminE: number;
	vitaminK: number;
	thiamin: number;
	riboflavin: number;
	niacin: number;
	vitaminB6: number;
	vitaminB12: number;
	folate: number;
	cholesterol: number;
};

export type AminoAcidTotals = {
	isoleucine: number;
	leucine: number;
	lysine: number;
	methionine: number;
	phenylalanine: number;
	threonine: number;
	tryptophan: number;
	valine: number;
	histidine: number;
	alanine: number;
	arginine: number;
	asparticAcid: number;
	cysteine: number;
	glutamicAcid: number;
	glycine: number;
	proline: number;
	serine: number;
	tyrosine: number;
};

const AMINO_ACID_KEYS: (keyof AminoAcidTotals)[] = [
	'isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine',
	'threonine', 'tryptophan', 'valine', 'histidine', 'alanine',
	'arginine', 'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine',
	'proline', 'serine', 'tyrosine',
];

export type IngredientNutrition = {
	name: string;
	calories: number;
	mapped: boolean;
};

/** Parse a recipe amount string to a number */
function parseAmount(amount: string): number {
	if (!amount?.trim()) return 0;
	let s = amount.trim();

	const rangeMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/);
	if (rangeMatch) {
		return (parseFloat(rangeMatch[1].replace(',', '.')) + parseFloat(rangeMatch[2].replace(',', '.'))) / 2;
	}

	s = s.replace(',', '.');

	const fractionMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
	if (fractionMatch) return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);

	const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
	if (mixedMatch) return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);

	const parsed = parseFloat(s);
	return isNaN(parsed) ? 0 : parsed;
}

/** Calculate grams for a single ingredient */
function calculateGrams(
	amount: string,
	mapping: NutritionMapping,
	multiplier: number
): number {
	if (mapping.excluded || !mapping.gramsPerUnit) return 0;
	const parsedAmount = parseAmount(amount) || (mapping.defaultAmountUsed ? 1 : 0);
	return parsedAmount * multiplier * mapping.gramsPerUnit;
}

export type ReferencedNutrition = {
	shortName: string;
	name: string;
	nutrition: Record<string, number>;
	baseMultiplier: number;
};

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, '');
}

/**
 * Create a reactive nutrition calculator.
 *
 * @param getFlatIngredients - getter for flattened ingredient list
 * @param getMappings - getter for nutrition mappings (with per100g resolved by the API)
 * @param getMultiplier - getter for the current recipe multiplier
 * @param getSectionNames - getter for section names (for dedup)
 * @param getReferencedNutrition - getter for pre-computed nutrition from referenced recipes
 */
export function createNutritionCalculator(
	getFlatIngredients: () => { name: string; unit: string; amount: string; sectionIndex: number; ingredientIndex: number; sectionName?: string }[],
	getMappings: () => NutritionMapping[],
	getMultiplier: () => number,
	getSectionNames?: () => Set<string>,
	getReferencedNutrition?: () => ReferencedNutrition[],
) {
	const mappingIndex = $derived(
		new Map(getMappings().map(m => [`${m.sectionIndex}-${m.ingredientIndex}`, m]))
	);

	/** Check if ingredient should be skipped (name matches a different section's name) */
	function isSkippedDuplicate(ing: { name: string; sectionName?: string }): boolean {
		if (!getSectionNames) return false;
		const names = getSectionNames();
		const stripped = stripHtml(ing.name).toLowerCase().trim();
		const ownSection = (ing.sectionName || '').toLowerCase().trim();
		return stripped !== '' && names.has(stripped) && stripped !== ownSection;
	}

	/** Check if ingredient is an anchor-tag reference to another recipe */
	function isAnchorRef(ing: { name: string }): boolean {
		return /<a\s/i.test(ing.name);
	}

	/** Check if ingredient should be excluded from direct nutrition calculation */
	function shouldSkip(ing: { name: string; sectionName?: string }): boolean {
		return isSkippedDuplicate(ing) || isAnchorRef(ing);
	}

	const perIngredient = $derived(
		getFlatIngredients().map(ing => {
			if (shouldSkip(ing)) return { name: ing.name, calories: 0, mapped: true };
			const mapping = mappingIndex.get(`${ing.sectionIndex}-${ing.ingredientIndex}`);
			if (!mapping || mapping.matchMethod === 'none' || mapping.excluded || !mapping.per100g) {
				return { name: ing.name, calories: 0, mapped: false };
			}

			const grams = calculateGrams(ing.amount, mapping, getMultiplier());
			const calories = (grams / 100) * mapping.per100g.calories;

			return { name: ing.name, calories, mapped: true };
		})
	);

	/** Add referenced recipe nutrition totals, scaled by multiplier and baseMultiplier */
	function addReferencedNutrition(result: Record<string, number>, mult: number) {
		if (!getReferencedNutrition) return;
		for (const ref of getReferencedNutrition()) {
			const scale = mult * ref.baseMultiplier;
			for (const [key, value] of Object.entries(ref.nutrition)) {
				if (key in result && typeof value === 'number') {
					result[key] += value * scale;
				}
			}
		}
	}

	const totalMacros = $derived.by(() => {
		const result: MacroTotals = { calories: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, sugars: 0 };
		const ingredients = getFlatIngredients();
		const mult = getMultiplier();

		for (const ing of ingredients) {
			if (shouldSkip(ing)) continue;
			const mapping = mappingIndex.get(`${ing.sectionIndex}-${ing.ingredientIndex}`);
			if (!mapping || mapping.matchMethod === 'none' || mapping.excluded || !mapping.per100g) continue;

			const factor = calculateGrams(ing.amount, mapping, mult) / 100;

			result.calories += factor * mapping.per100g.calories;
			result.protein += factor * mapping.per100g.protein;
			result.fat += factor * mapping.per100g.fat;
			result.saturatedFat += factor * mapping.per100g.saturatedFat;
			result.carbs += factor * mapping.per100g.carbs;
			result.fiber += factor * mapping.per100g.fiber;
			result.sugars += factor * mapping.per100g.sugars;
		}

		addReferencedNutrition(result, mult);
		return result;
	});

	const totalMicros = $derived.by(() => {
		const result: MicroTotals = {
			calcium: 0, iron: 0, magnesium: 0, phosphorus: 0,
			potassium: 0, sodium: 0, zinc: 0,
			vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0,
			vitaminK: 0, thiamin: 0, riboflavin: 0, niacin: 0,
			vitaminB6: 0, vitaminB12: 0, folate: 0, cholesterol: 0,
		};
		const ingredients = getFlatIngredients();
		const mult = getMultiplier();

		for (const ing of ingredients) {
			if (shouldSkip(ing)) continue;
			const mapping = mappingIndex.get(`${ing.sectionIndex}-${ing.ingredientIndex}`);
			if (!mapping || mapping.matchMethod === 'none' || mapping.excluded || !mapping.per100g) continue;

			const factor = calculateGrams(ing.amount, mapping, mult) / 100;
			for (const key of Object.keys(result) as (keyof MicroTotals)[]) {
				result[key] += factor * ((mapping.per100g as any)[key] || 0);
			}
		}

		addReferencedNutrition(result as Record<string, number>, mult);
		return result;
	});

	const totalAminoAcids = $derived.by(() => {
		const result: AminoAcidTotals = {
			isoleucine: 0, leucine: 0, lysine: 0, methionine: 0, phenylalanine: 0,
			threonine: 0, tryptophan: 0, valine: 0, histidine: 0, alanine: 0,
			arginine: 0, asparticAcid: 0, cysteine: 0, glutamicAcid: 0, glycine: 0,
			proline: 0, serine: 0, tyrosine: 0,
		};
		const ingredients = getFlatIngredients();
		const mult = getMultiplier();

		for (const ing of ingredients) {
			if (shouldSkip(ing)) continue;
			const mapping = mappingIndex.get(`${ing.sectionIndex}-${ing.ingredientIndex}`);
			if (!mapping || mapping.matchMethod === 'none' || mapping.excluded || !mapping.per100g) continue;

			const factor = calculateGrams(ing.amount, mapping, mult) / 100;
			for (const key of AMINO_ACID_KEYS) {
				result[key] += factor * ((mapping.per100g as any)[key] || 0);
			}
		}

		addReferencedNutrition(result as Record<string, number>, mult);
		return result;
	});

	const coverage = $derived.by(() => {
		const ingredients = getFlatIngredients();
		if (ingredients.length === 0) return 1;
		let total = 0;
		let mapped = 0;
		for (const ing of ingredients) {
			// Skipped duplicates and anchor-tag refs count as covered
			if (shouldSkip(ing)) { total++; mapped++; continue; }
			total++;
			const m = mappingIndex.get(`${ing.sectionIndex}-${ing.ingredientIndex}`);
			// Manually excluded ingredients count as covered
			if (m?.excluded) { total++; mapped++; continue; }
			if (m && m.matchMethod !== 'none') mapped++;
		}
		return total > 0 ? mapped / total : 1;
	});

	const unmapped = $derived(
		getFlatIngredients()
			.filter(ing => {
				if (shouldSkip(ing)) return false;
				const m = mappingIndex.get(`${ing.sectionIndex}-${ing.ingredientIndex}`);
				if (m?.excluded) return false;
				return !m || m.matchMethod === 'none';
			})
			.map(ing => stripHtml(ing.name))
	);

	return {
		get perIngredient() { return perIngredient; },
		get totalMacros() { return totalMacros; },
		get totalMicros() { return totalMicros; },
		get totalAminoAcids() { return totalAminoAcids; },
		get coverage() { return coverage; },
		get unmapped() { return unmapped; },
	};
}

/**
 * Default amounts for ingredients listed without an explicit amount in a recipe.
 * E.g., just "salt" with no quantity defaults to 1 pinch.
 *
 * Resolution order:
 * 1. Exact match on normalized ingredient name
 * 2. Category-based fallback (keyed by USDA food category prefix with '_')
 * 3. Mark as unmapped
 */

export type DefaultAmount = { amount: number; unit: string };

/** Exact-match defaults for common ingredients listed without amounts */
export const DEFAULT_AMOUNTS: Record<string, DefaultAmount> = {
	// Salt & pepper
	'salt': { amount: 1, unit: 'pinch' },
	'pepper': { amount: 1, unit: 'pinch' },
	'black pepper': { amount: 1, unit: 'pinch' },
	'white pepper': { amount: 1, unit: 'pinch' },
	'sea salt': { amount: 1, unit: 'pinch' },

	// Common spices
	'cinnamon': { amount: 0.5, unit: 'tsp' },
	'nutmeg': { amount: 0.25, unit: 'tsp' },
	'paprika': { amount: 0.5, unit: 'tsp' },
	'cumin': { amount: 0.5, unit: 'tsp' },
	'turmeric': { amount: 0.25, unit: 'tsp' },
	'chili flakes': { amount: 0.25, unit: 'tsp' },
	'cayenne pepper': { amount: 0.25, unit: 'tsp' },
	'garlic powder': { amount: 0.5, unit: 'tsp' },
	'onion powder': { amount: 0.5, unit: 'tsp' },
	'oregano': { amount: 0.5, unit: 'tsp' },
	'thyme': { amount: 0.5, unit: 'tsp' },
	'rosemary': { amount: 0.5, unit: 'tsp' },

	// Fresh herbs
	'parsley': { amount: 1, unit: 'tbsp' },
	'basil': { amount: 1, unit: 'tbsp' },
	'cilantro': { amount: 1, unit: 'tbsp' },
	'coriander': { amount: 1, unit: 'tbsp' },
	'dill': { amount: 1, unit: 'tbsp' },
	'chives': { amount: 1, unit: 'tbsp' },
	'mint': { amount: 1, unit: 'tbsp' },

	// Oils/fats (when listed for greasing)
	'oil': { amount: 1, unit: 'tbsp' },
	'olive oil': { amount: 1, unit: 'tbsp' },
	'vegetable oil': { amount: 1, unit: 'tbsp' },
	'butter': { amount: 1, unit: 'tbsp' },

	// Liquids
	'water': { amount: 0, unit: 'ml' }, // excluded from calorie calc
	'vanilla extract': { amount: 1, unit: 'tsp' },
	'lemon juice': { amount: 1, unit: 'tbsp' },
	'vinegar': { amount: 1, unit: 'tbsp' },
	'soy sauce': { amount: 1, unit: 'tbsp' },
};

/** Category-based fallbacks when no exact match is found.
 *  Keyed with '_' prefix to distinguish from ingredient names. */
export const CATEGORY_FALLBACKS: Record<string, DefaultAmount> = {
	'_Spices and Herbs': { amount: 0.5, unit: 'tsp' },
	'_Fats and Oils': { amount: 1, unit: 'tbsp' },
	'_Beverages': { amount: 100, unit: 'ml' },
};

/**
 * Resolve a default amount for an ingredient that has no amount specified.
 * Returns the default amount and unit, or null if no default is available.
 */
export function resolveDefaultAmount(
	normalizedName: string,
	usdaCategory?: string
): DefaultAmount | null {
	// Exact match
	if (DEFAULT_AMOUNTS[normalizedName]) {
		return DEFAULT_AMOUNTS[normalizedName];
	}

	// Partial match: check if any key is contained in the name or vice versa
	for (const [key, value] of Object.entries(DEFAULT_AMOUNTS)) {
		if (normalizedName.includes(key) || key.includes(normalizedName)) {
			return value;
		}
	}

	// Category fallback
	if (usdaCategory && CATEGORY_FALLBACKS[`_${usdaCategory}`]) {
		return CATEGORY_FALLBACKS[`_${usdaCategory}`];
	}

	return null;
}

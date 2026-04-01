/**
 * Unit canonicalization and gram conversion tables for recipe nutrition calculation.
 *
 * German and English recipe units are mapped to canonical keys.
 * Ingredient-specific conversions (e.g., 1 tbsp butter = 14.2g) are resolved
 * via USDA portion data at matching time — this file only handles unit normalization
 * and ingredient-independent conversions.
 */

/** Maps various unit strings (German + English) to a canonical unit key */
export const UNIT_CANONICAL: Record<string, string> = {
	// German → canonical
	'EL': 'tbsp',
	'el': 'tbsp',
	'Esslöffel': 'tbsp',
	'TL': 'tsp',
	'tl': 'tsp',
	'Teelöffel': 'tsp',
	'Prise': 'pinch',
	'Prisen': 'pinch',
	'Msp': 'pinch',
	'Msp.': 'pinch',
	'Messerspitze': 'pinch',
	'Bund': 'bunch',
	'Stück': 'piece',
	'Stk': 'piece',
	'Stk.': 'piece',
	'Scheibe': 'slice',
	'Scheiben': 'slice',
	'Zehe': 'clove',
	'Zehen': 'clove',
	'Blatt': 'leaf',
	'Blätter': 'leaf',
	'Zweig': 'sprig',
	'Zweige': 'sprig',
	'Dose': 'can',
	'Dosen': 'can',
	'Becher': 'cup',
	'Tasse': 'cup',
	'Tassen': 'cup',
	'Packung': 'package',
	'Pkg': 'package',
	'Pkg.': 'package',
	'Würfel': 'cube',

	// English → canonical (passthrough + normalization)
	'tbsp': 'tbsp',
	'Tbsp': 'tbsp',
	'tablespoon': 'tbsp',
	'tablespoons': 'tbsp',
	'tsp': 'tsp',
	'Tsp': 'tsp',
	'teaspoon': 'tsp',
	'teaspoons': 'tsp',
	'cup': 'cup',
	'cups': 'cup',
	'pinch': 'pinch',
	'piece': 'piece',
	'pieces': 'piece',
	'slice': 'slice',
	'slices': 'slice',
	'clove': 'clove',
	'cloves': 'clove',
	'sprig': 'sprig',
	'sprigs': 'sprig',
	'bunch': 'bunch',
	'leaf': 'leaf',
	'leaves': 'leaf',
	'can': 'can',
	'package': 'package',
	'cube': 'cube',

	// Weight/volume units (already canonical, but normalize variants)
	'g': 'g',
	'gr': 'g',
	'gram': 'g',
	'grams': 'g',
	'Gramm': 'g',
	'kg': 'kg',
	'kilogram': 'kg',
	'ml': 'ml',
	'mL': 'ml',
	'milliliter': 'ml',
	'Milliliter': 'ml',
	'l': 'l',
	'L': 'l',
	'liter': 'l',
	'Liter': 'l',
	'oz': 'oz',
	'ounce': 'oz',
	'ounces': 'oz',
	'lb': 'lb',
	'lbs': 'lb',
	'pound': 'lb',
	'pounds': 'lb',
};

/** Direct gram conversions for weight/volume units (ingredient-independent) */
export const UNIT_TO_GRAMS: Record<string, number> = {
	'g': 1,
	'kg': 1000,
	'oz': 28.3495,
	'lb': 453.592,
	// Volume units use water density (1 ml = 1g) as base;
	// adjusted by ingredient-specific density when available
	'ml': 1,
	'l': 1000,
};

/**
 * Fallback gram estimates for common measurement units when no USDA portion data is available.
 * These are rough averages across common ingredients.
 */
export const UNIT_GRAM_FALLBACKS: Record<string, number> = {
	'tbsp': 15,     // ~15ml, varies by ingredient density
	'tsp': 5,       // ~5ml
	'cup': 240,     // US cup = ~240ml
	'pinch': 0.3,
	'slice': 30,
	'clove': 3,     // garlic clove
	'sprig': 2,
	'bunch': 30,
	'leaf': 0.5,
	'cube': 25,     // bouillon cube
	'can': 400,     // standard can
	'package': 200,
};

/** Canonicalize a unit string. Returns the canonical key, or the original lowercased string if unknown. */
export function canonicalizeUnit(unit: string): string {
	const trimmed = unit.trim();
	return UNIT_CANONICAL[trimmed] || UNIT_CANONICAL[trimmed.toLowerCase()] || trimmed.toLowerCase();
}

/**
 * Get the gram weight for a given canonical unit, using USDA portion data when available.
 * Falls back to standard conversions and then generic estimates.
 */
export function resolveGramsPerUnit(
	canonicalUnit: string,
	usdaPortions: { description: string; grams: number }[],
	density?: number
): { grams: number; source: 'direct' | 'density' | 'usda_portion' | 'estimate' | 'none' } {
	// Direct weight conversion
	if (canonicalUnit in UNIT_TO_GRAMS) {
		const baseGrams = UNIT_TO_GRAMS[canonicalUnit];
		// Apply density for volume units
		if ((canonicalUnit === 'ml' || canonicalUnit === 'l') && density) {
			return { grams: baseGrams * density, source: 'density' };
		}
		return { grams: baseGrams, source: 'direct' };
	}

	// Try to match against USDA portions
	if (usdaPortions.length > 0) {
		const unitLower = canonicalUnit.toLowerCase();
		for (const portion of usdaPortions) {
			const descLower = portion.description.toLowerCase();
			// Match "1 tbsp", "tbsp", "tablespoon", etc.
			if (descLower.includes(unitLower) ||
				(unitLower === 'tbsp' && descLower.includes('tablespoon')) ||
				(unitLower === 'tsp' && descLower.includes('teaspoon')) ||
				(unitLower === 'cup' && descLower.includes('cup')) ||
				(unitLower === 'piece' && (descLower.includes('unit') || descLower.includes('medium') || descLower.includes('whole'))) ||
				(unitLower === 'slice' && descLower.includes('slice'))) {
				return { grams: portion.grams, source: 'usda_portion' };
			}
		}
	}

	// Fallback estimates
	if (canonicalUnit in UNIT_GRAM_FALLBACKS) {
		return { grams: UNIT_GRAM_FALLBACKS[canonicalUnit], source: 'estimate' };
	}

	return { grams: 0, source: 'none' };
}

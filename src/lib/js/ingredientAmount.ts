/**
 * How many grams a recipe ingredient line contributes.
 *
 * The answer used to be computed in five places — the client calculator, the
 * recipe-per-100 g cache, the food-log button, the search endpoint and the
 * matcher — and the five had already drifted: two of them could not parse
 * `"1 1/2"`. Since the number they produce is cached onto the recipe and
 * summed into the food diary, a disagreement between them is a disagreement
 * about what the user ate. One implementation, imported by all of them.
 *
 * Deliberately plain `.ts`: it is imported from both `$lib/server` and from
 * components, so it can carry neither runes nor a database handle.
 */

/** The mapping fields the arithmetic reads. Typed structurally rather than as
 *  `NutritionMapping` so lean Mongo documents, `$state` proxies and typed
 *  values all satisfy it without a cast. */
export type AmountMapping = {
	excluded?: boolean;
	gramsPerUnit?: number;
	/** Units assumed for a line that states no amount — see `ingredientUnits`. */
	defaultAmount?: number;
};

/**
 * Parse a recipe amount string to a number.
 *
 * Handles what recipe lines actually contain: `"250"`, `"1,5"`, `"1/2"`,
 * `"1 1/2"`, and ranges like `"2-3"` or `"2–3"` (en dash), which resolve to
 * their midpoint. Anything unparseable — `"etwas"`, `"nach Geschmack"` — is 0.
 */
export function parseAmount(amount: string | undefined | null): number {
	if (!amount || !amount.trim()) return 0;
	let s = amount.trim();

	// Before the comma is normalised, so "2,5-3,5" is still seen as a range.
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

/**
 * How many of the ingredient's units the line represents.
 *
 * A line that states no amount falls back to the default the matcher resolved
 * for it — half a teaspoon of a spice, a tablespoon of oil — and failing that,
 * to a single occurrence. "Olivenöl" in an ingredient list means some olive
 * oil, not none: counting it as zero meant no gram weight you set for it could
 * ever reach the total, which read as the field being broken.
 *
 * A line no one meant to count is expressed by skipping it, not by leaving its
 * amount blank. `resolveDefaultAmount` already returns 0 for "nach Geschmack"
 * cases and the matcher marks those `excluded`, so they never reach here.
 */
export function ingredientUnits(mapping: AmountMapping, amount: string | undefined | null): number {
	return parseAmount(amount) || mapping.defaultAmount || 1;
}

/**
 * Grams this ingredient line contributes to the pot.
 *
 * Zero for a skipped line, and zero when the unit could not be converted at all
 * (`gramsPerUnit` is 0 for an unrecognised unit) — an unknown weight is not a
 * weight of nothing, but it is the only honest number to add to a sum.
 *
 * `includeExcluded` is for coverage denominators: a skipped 500 g of water is
 * legitimately part of what the recipe weighs, and counting it is the point of
 * asking how much of the dish is accounted for.
 */
export function ingredientGrams(
	mapping: AmountMapping,
	amount: string | undefined | null,
	multiplier = 1,
	opts?: { includeExcluded?: boolean },
): number {
	if (mapping.excluded && !opts?.includeExcluded) return 0;
	if (!mapping.gramsPerUnit) return 0;
	return ingredientUnits(mapping, amount) * multiplier * mapping.gramsPerUnit;
}

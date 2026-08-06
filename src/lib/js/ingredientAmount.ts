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
 * Hedges people put in front of an amount. They say the number is approximate,
 * which changes nothing about how much to count — "~125 ml" is 125 ml. Left in
 * place they defeated `parseFloat` outright, so the line fell through to its
 * default of one unit and a glass of milk was weighed as a millilitre.
 */
const APPROX_PREFIX =
	/^(?:~|≈|∼|±|\+\/-|ca\.?|circa|zirka|etwa|ungefähr|ungefaehr|approx\.?|about|rund|gut|knapp)\s*/;

/** Typed as one character but meaning two numbers and a slash. */
const VULGAR_FRACTIONS: Record<string, string> = {
	'½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
	'⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6',
	'⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

/** A bare number, decimal comma or point. */
const NUM = String.raw`\d+(?:[.,]\d+)?`;

/**
 * Parse a recipe amount string to a number.
 *
 * Handles what recipe lines actually contain: `"250"`, `"1,5"`, `"1/2"`,
 * `"1 1/2"`, `"1½"`, hedges like `"~125"` or `"ca. 3"`, and ranges — `"2-3"`,
 * `"2–3"`, `"2 bis 3"` — which resolve to their midpoint. Trailing text is
 * ignored, so a unit left in the amount field does not break the number.
 * Anything unparseable — `"etwas"`, `"nach Geschmack"` — is 0.
 */
export function parseAmount(amount: string | undefined | null): number {
	if (!amount || !amount.trim()) return 0;
	let s = amount.trim().toLowerCase();

	// Repeated because both halves of "ca. ~125" are hedges, and because a range
	// can carry one on each side ("ca. 2 bis ca. 3").
	while (APPROX_PREFIX.test(s)) s = s.replace(APPROX_PREFIX, '');

	// "1½" becomes "1 1/2" and a bare "½" becomes "1/2", which the mixed and
	// plain fraction branches below already understand.
	for (const [glyph, fraction] of Object.entries(VULGAR_FRACTIONS)) {
		if (s.includes(glyph)) s = s.split(glyph).join(` ${fraction}`).trim();
	}

	// Before the comma is normalised, so "2,5-3,5" is still seen as a range. The
	// second number may carry its own hedge, and anything after it is a unit.
	const rangeMatch = s.match(
		new RegExp(String.raw`^(${NUM})\s*(?:[-–—−]|bis|to)\s*(?:${APPROX_PREFIX.source.slice(1)})?(${NUM})(?![\d.,/])`)
	);
	if (rangeMatch) {
		return (
			(parseFloat(rangeMatch[1].replace(',', '.')) + parseFloat(rangeMatch[2].replace(',', '.'))) / 2
		);
	}

	s = s.replace(',', '.');

	const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
	if (mixedMatch) return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);

	const fractionMatch = s.match(/^(\d+)\s*\/\s*(\d+)/);
	if (fractionMatch) return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);

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

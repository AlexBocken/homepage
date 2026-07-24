/**
 * Open Food Facts unit conversion.
 *
 * OFF normalises every nutriment except energy to **grams per 100 g**, including
 * the ones a nutrition label states in milligrams or micrograms: a product with
 * 12.9 mg of vitamin C is stored as `vitamin-c_100g: 0.0129`.
 *
 * `NutritionPer100g` uses the units the reference intakes are stated in — mg for
 * most minerals, µg for the vitamins dosed that way — the same units BLS and USDA
 * are imported into. So every OFF figure has to be scaled on the way in, or an OFF
 * product contributes a thousandth of its real micronutrients to a day's total.
 *
 * Macros and fatty acids are grams in both conventions and are left alone.
 *
 * The mirrored documents stay in OFF's convention: the importer mirrors a public
 * database and the USDA-branded enricher writes into it, so both keep the source's
 * units and the conversion happens once, on read.
 *
 * Kept free of Mongoose and SvelteKit imports so the backfill script can share this
 * table rather than keep a copy that drifts.
 */

export const OFF_UNIT_SCALE: Record<string, number> = {
	calcium: 1e3, iron: 1e3, magnesium: 1e3, phosphorus: 1e3, potassium: 1e3,
	sodium: 1e3, zinc: 1e3, vitaminC: 1e3, vitaminE: 1e3, thiamin: 1e3,
	riboflavin: 1e3, niacin: 1e3, vitaminB6: 1e3, cholesterol: 1e3,
	vitaminA: 1e6, vitaminD: 1e6, vitaminK: 1e6, vitaminB12: 1e6, folate: 1e6,
};

/**
 * An OFF record's nutrition in the units the rest of the app works in.
 *
 * Always apply this to a document read out of the `openfoodfacts` collection, and
 * never to anything else — running it twice multiplies a real figure by a thousand
 * a second time.
 */
export function offPer100gToAppUnits(
	per100g: Record<string, number> | null | undefined
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const [k, v] of Object.entries(per100g ?? {})) {
		if (typeof v !== 'number' || Number.isNaN(v)) continue;
		const scale = OFF_UNIT_SCALE[k];
		// Rounded because 0.0129 * 1000 is 12.899999999999999 in binary floating
		// point, and that lands in a food log entry's stored snapshot.
		out[k] = scale ? Math.round(v * scale * 1e4) / 1e4 : v;
	}
	return out;
}

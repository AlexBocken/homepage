/**
 * Trace minerals: copper, manganese, iodine, selenium, chromium and molybdenum.
 *
 * These are kept apart from the six core minerals because no source carries all of
 * them, and the gaps do not overlap:
 *
 *   - BLS 4.0 has no selenium column at all, but measures the other five for
 *     81–99% of its 7,140 foods.
 *   - USDA has selenium for 88% of the imported foods and copper and manganese for
 *     ~91% / ~82%, but iodine for 0.5% and no chromium or molybdenum whatsoever.
 *   - Open Food Facts products declare none of them in any useful number.
 *
 * So a day logged from mixed sources will have a real figure for some of these and
 * nothing at all for others, and the two must not look the same. Totals are summed
 * only over the entries that report each mineral — the rule the fatty acids already
 * follow — and the share of the day those entries account for is returned next to
 * them, so a number measured across a fifth of what you ate can be labelled as such
 * instead of being read as a deficiency.
 */

type Per100g = Partial<Record<string, number | undefined | null>> | null | undefined;

export const TRACE_MINERAL_KEYS = [
	'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum',
] as const;

export type TraceMineralKey = (typeof TRACE_MINERAL_KEYS)[number];

type Entry = {
	amountGrams?: number;
	per100g?: Per100g;
};

export type TraceTotals = {
	/** Summed intake per mineral, over the entries that reported it. Absent when no
	 *  entry reported one at all — distinct from a measured zero. */
	totals: Partial<Record<TraceMineralKey, number>>;
	/** Share of the day's calories (or grams, see `basis`) whose entry reported the
	 *  mineral, 0–1. A total is only as meaningful as this number. */
	coverage: Record<TraceMineralKey, number>;
	/** Calories are the weighting unless nothing logged carries any, then grams. */
	basis: 'calories' | 'grams';
};

/** True when this record carries a figure for the mineral (a stored 0 counts). */
export function reportsTrace(per100g: Per100g, key: TraceMineralKey): boolean {
	const v = per100g?.[key];
	return typeof v === 'number' && !Number.isNaN(v);
}

/**
 * Sum trace minerals across food log entries, weighting coverage by calories for
 * the same reason `microCoverage` does: 300 g of mineral water missing its copper
 * figure says far less about a day than 80 g of an unlabelled bar.
 */
export function traceTotals(entries: Entry[] | null | undefined): TraceTotals {
	const totals: Partial<Record<TraceMineralKey, number>> = {};
	const covered = {} as Record<TraceMineralKey, number>;
	const coveredGrams = {} as Record<TraceMineralKey, number>;
	for (const k of TRACE_MINERAL_KEYS) { covered[k] = 0; coveredGrams[k] = 0; }

	let totalCalories = 0;
	let totalGrams = 0;

	for (const e of entries ?? []) {
		const grams = e.amountGrams ?? 0;
		if (grams <= 0) continue;
		const p = e.per100g;
		const kcal = ((p?.calories ?? 0) as number) * grams / 100;
		totalGrams += grams;
		totalCalories += kcal;

		for (const k of TRACE_MINERAL_KEYS) {
			if (!reportsTrace(p, k)) continue;
			totals[k] = (totals[k] ?? 0) + (p![k] as number) * grams / 100;
			covered[k] += kcal;
			coveredGrams[k] += grams;
		}
	}

	const useCalories = totalCalories > 0;
	const total = useCalories ? totalCalories : totalGrams;
	const source = useCalories ? covered : coveredGrams;

	const coverage = {} as Record<TraceMineralKey, number>;
	// Nothing logged means nothing is missing: an empty day reports full coverage so
	// it renders as "no data yet" rather than as a gap the user could have avoided.
	for (const k of TRACE_MINERAL_KEYS) coverage[k] = total > 0 ? source[k] / total : 1;

	return { totals, coverage, basis: useCalories ? 'calories' : 'grams' };
}

/**
 * Note explaining how much of the intake each figure was actually measured across.
 * Empty when every mineral is covered — there is nothing to warn about.
 */
export function traceCoverageNote(coverage: Record<TraceMineralKey, number>, isEn: boolean): string {
	const worst = Math.min(...TRACE_MINERAL_KEYS.map(k => coverage[k]));
	if (worst >= 0.995) return '';
	const pct = Math.round(worst * 100);
	return isEn
		? `Summed only over the foods that report each mineral — the weakest is measured across ${pct}% of what you ate, so a low figure here can mean a gap in the data rather than in the diet. BLS publishes no selenium; USDA publishes no chromium, molybdenum or iodine.`
		: `Nur über die Lebensmittel summiert, die den jeweiligen Mineralstoff angeben — der schwächste ist über ${pct}% des Gegessenen gemessen. Ein niedriger Wert kann also eine Datenlücke sein und keine Versorgungslücke. Der BLS führt kein Selen, die USDA-Daten kein Chrom, Molybdän und praktisch kein Jod.`;
}

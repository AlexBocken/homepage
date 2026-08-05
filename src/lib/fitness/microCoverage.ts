/**
 * How much of a set of food log entries actually carries micronutrient data.
 *
 * The three data sources differ sharply. BLS and USDA write every nutrient key
 * explicitly, so a stored 0 means "measured, none present" — oats really do have
 * no B12. Open Food Facts writes only the keys a product happens to declare, and
 * its importer maps no amino acids at all, so an OFF entry never has them.
 *
 * That makes key *presence* the signal, not value > 0: an absent key is unknown,
 * a zero is a measurement. Coverage is tracked per nutrient group, because OFF
 * products routinely declare a mineral or two and nothing else — judging them on
 * "has any micronutrient" would wave through a record that is mostly empty.
 */

/** The minerals every source measures. The six trace minerals in
 *  $lib/fitness/traceMinerals are deliberately not probed here: BLS publishes no
 *  selenium and USDA no chromium or molybdenum, so a record missing one says
 *  something about its source rather than about how well characterised it is, and
 *  counting them would fail well-populated entries from both databases. */
export const MINERAL_KEYS = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'zinc'];
/** The vitamins every source measures, in the shared display order — pantothenic
 *  acid, biotin and retinol are left out for the same reason as the trace
 *  minerals: a record missing them says something about its source. */
export const VITAMIN_KEYS = [
	'vitaminA', 'vitaminD', 'vitaminE', 'vitaminK', 'vitaminC',
	'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'folate', 'vitaminB12',
];
export const AMINO_KEYS = [
	'leucine', 'isoleucine', 'valine', 'lysine', 'methionine',
	'phenylalanine', 'threonine', 'tryptophan', 'histidine',
];

export const NUTRIENT_GROUPS = {
	minerals: MINERAL_KEYS,
	vitamins: VITAMIN_KEYS,
	aminos: AMINO_KEYS,
} as const;

export type GroupName = keyof typeof NUTRIENT_GROUPS;
export type GroupFlags = Record<GroupName, boolean>;

type Per100g = Record<string, number | undefined | null> | null | undefined;

type Entry = {
	source?: string;
	name?: string;
	amountGrams?: number;
	per100g?: Per100g;
};

/** Sodium is excluded from the mineral probe: OFF derives it from salt on nearly
 *  every product, so counting it would mark macro-only records as covered. */
function present(per100g: Per100g, key: string): boolean {
	return typeof per100g?.[key] === 'number';
}

/** A group counts as reported when at least half its nutrients are present. */
export function groupsPresent(per100g: Per100g): GroupFlags {
	const flags = {} as GroupFlags;
	for (const [group, keys] of Object.entries(NUTRIENT_GROUPS) as [GroupName, readonly string[]][]) {
		const n = keys.filter(k => present(per100g, k)).length;
		flags[group] = n >= keys.length / 2;
	}
	return flags;
}

/** True only when minerals, vitamins and amino acids are all reported. */
export function hasMicros(per100g: Per100g): boolean {
	const g = groupsPresent(per100g);
	return g.minerals && g.vitamins && g.aminos;
}

export type MicroCoverage = {
	/** Share of logged calories whose entry reports that group, 0–1. */
	ratios: Record<GroupName, number>;
	/** The weakest group's ratio — what a single headline warning should quote. */
	worst: number;
	totalCalories: number;
	totalGrams: number;
	/** Calories are the weighting unless nothing logged carries any, then grams. */
	basis: 'calories' | 'grams';
	/** Names of entries not fully covered, deduplicated, for the warning text. */
	missing: string[];
};

/**
 * Coverage is weighted by calories rather than grams: 300 g of sparkling water
 * missing its vitamin figures says far less about a day than 30 g of an
 * unlabelled protein bar. Falls back to grams if nothing logged carries calories.
 */
export function microCoverage(entries: Entry[] | null | undefined): MicroCoverage {
	const covered: Record<GroupName, number> = { minerals: 0, vitamins: 0, aminos: 0 };
	const coveredGrams: Record<GroupName, number> = { minerals: 0, vitamins: 0, aminos: 0 };
	let totalCalories = 0;
	let totalGrams = 0;
	const missing = new Set<string>();

	for (const e of entries ?? []) {
		const grams = e.amountGrams ?? 0;
		if (grams <= 0) continue;
		const kcal = ((e.per100g?.calories ?? 0) as number) * grams / 100;
		totalGrams += grams;
		totalCalories += kcal;

		const g = groupsPresent(e.per100g);
		for (const group of Object.keys(covered) as GroupName[]) {
			if (g[group]) {
				covered[group] += kcal;
				coveredGrams[group] += grams;
			}
		}
		if ((!g.minerals || !g.vitamins || !g.aminos) && e.name) missing.add(e.name);
	}

	const useCalories = totalCalories > 0;
	const total = useCalories ? totalCalories : totalGrams;
	const source = useCalories ? covered : coveredGrams;

	const ratios = {
		minerals: total > 0 ? source.minerals / total : 1,
		vitamins: total > 0 ? source.vitamins / total : 1,
		aminos: total > 0 ? source.aminos / total : 1,
	};

	return {
		ratios,
		worst: Math.min(ratios.minerals, ratios.vitamins, ratios.aminos),
		totalCalories,
		totalGrams,
		basis: useCalories ? 'calories' : 'grams',
		missing: [...missing],
	};
}

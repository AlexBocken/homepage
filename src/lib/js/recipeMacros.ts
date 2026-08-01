/**
 * The compact nutrition facet carried by every brief recipe, and the rules for
 * filtering a listing on it.
 *
 * A recipe's macro split is expressed as a share of its calories, not of its
 * mass — "40 % protein" means 40 % of what you get out of the plate, which is
 * how a macro target is written. That also makes the figure independent of
 * portion size, so it is comparable across a 30 g biscuit and a 600 g stew.
 * Energy per portion is the one absolute number, and it only exists where the
 * recipe states how many portions it makes.
 */

export type RecipeMacros = {
	/** Energy per 100 g, kcal. */
	kcal100: number;
	/** Energy per stated portion, kcal — null when the recipe states no portions. */
	kcalPortion: number | null;
	/** Share of calories, 0–100. The three always sum to 100. */
	protein: number;
	fat: number;
	carbs: number;
};

const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 } as const;

/** Leading number of a portions string: "4 Portionen", "ca. 12 Stück", "2-3". */
export function parsePortions(portions: string | undefined | null): number {
	if (!portions) return 0;
	const match = portions.match(/(\d+(?:[.,]\d+)?)/);
	if (!match) return 0;
	const n = parseFloat(match[1].replace(',', '.'));
	return isNaN(n) || n <= 0 ? 0 : n;
}

/**
 * Build the facet from a recipe's cached per-100 g figures. Returns null when
 * there is nothing to say — no cache, or a cache with no energy in it, which
 * is what an unmapped recipe looks like.
 */
export function recipeMacros(
	per100g: { calories?: number; protein?: number; fat?: number; carbs?: number } | null | undefined,
	totalGrams: number | null | undefined,
	portions: string | null | undefined
): RecipeMacros | null {
	if (!per100g) return null;
	const kcal100 = per100g.calories ?? 0;
	const protein = per100g.protein ?? 0;
	const fat = per100g.fat ?? 0;
	const carbs = per100g.carbs ?? 0;
	if (kcal100 <= 0) return null;

	const fromMacros = protein * KCAL_PER_G.protein + fat * KCAL_PER_G.fat + carbs * KCAL_PER_G.carbs;
	if (fromMacros <= 0) return null;

	// Round two shares and give the remainder to the third, so the bar always
	// fills exactly and no recipe reads as 101 % of itself.
	const pctProtein = Math.round((protein * KCAL_PER_G.protein) / fromMacros * 100);
	const pctFat = Math.round((fat * KCAL_PER_G.fat) / fromMacros * 100);

	const portionCount = parsePortions(portions);
	const grams = totalGrams ?? 0;
	const kcalPortion =
		portionCount > 0 && grams > 0 ? Math.round((kcal100 * grams) / 100 / portionCount) : null;

	return {
		kcal100: Math.round(kcal100),
		kcalPortion,
		protein: pctProtein,
		fat: pctFat,
		carbs: 100 - pctProtein - pctFat
	};
}

/** A macro filter: percentage-of-calories bounds plus an energy bound. */
export type MacroFilter = {
	proteinMin: number;
	proteinMax: number;
	fatMin: number;
	fatMax: number;
	carbsMin: number;
	carbsMax: number;
	kcalMin: number;
	kcalMax: number;
	/** Keep recipes whose nutrition was never calculated. */
	includeUnknown: boolean;
};

export const MACRO_KCAL_CEILING = 1500;

export const MACRO_FILTER_DEFAULTS: MacroFilter = {
	proteinMin: 0,
	proteinMax: 100,
	fatMin: 0,
	fatMax: 100,
	carbsMin: 0,
	carbsMax: 100,
	kcalMin: 0,
	kcalMax: MACRO_KCAL_CEILING,
	includeUnknown: true
};

/** Named starting points — each sets only the axes it is actually about. */
export const MACRO_PRESETS = {
	high_protein: { proteinMin: 25 },
	low_carb: { carbsMax: 30 },
	light: { kcalMax: 400 }
} as const satisfies Record<string, Partial<MacroFilter>>;

export type MacroPresetKey = keyof typeof MACRO_PRESETS;

export function isMacroFilterActive(f: MacroFilter): boolean {
	return (
		f.proteinMin > 0 ||
		f.proteinMax < 100 ||
		f.fatMin > 0 ||
		f.fatMax < 100 ||
		f.carbsMin > 0 ||
		f.carbsMax < 100 ||
		f.kcalMin > 0 ||
		f.kcalMax < MACRO_KCAL_CEILING
	);
}

export function matchesMacroFilter(macros: RecipeMacros | null | undefined, f: MacroFilter): boolean {
	if (!macros) return f.includeUnknown;
	if (macros.protein < f.proteinMin || macros.protein > f.proteinMax) return false;
	if (macros.fat < f.fatMin || macros.fat > f.fatMax) return false;
	if (macros.carbs < f.carbsMin || macros.carbs > f.carbsMax) return false;

	// The energy bound reads per portion where the recipe states one, and per
	// 100 g otherwise — a recipe that never says how much it makes is judged on
	// the only number it has rather than being dropped from every energy query.
	const energy = macros.kcalPortion ?? macros.kcal100;
	if (energy < f.kcalMin) return false;
	// At the ceiling the slider means "no upper bound", so a 2000 kcal whole-tray bake
	// stays in the list rather than falling off the end of the track.
	if (f.kcalMax < MACRO_KCAL_CEILING && energy > f.kcalMax) return false;
	return true;
}

/** Whether a preset's bounds are all currently in force. */
export function isPresetActive(f: MacroFilter, key: MacroPresetKey): boolean {
	const preset = MACRO_PRESETS[key] as Partial<MacroFilter>;
	return Object.entries(preset).every(([k, v]) => f[k as keyof MacroFilter] === v);
}

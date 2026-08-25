// Nutrition per-100g data shape (shared by BLS and USDA sources)
export type NutritionPer100g = {
  calories: number; protein: number; fat: number; saturatedFat: number;
  carbs: number; fiber: number; sugars: number;
  calcium: number; iron: number; magnesium: number; phosphorus: number;
  potassium: number; sodium: number; zinc: number;
  // Trace minerals. Optional because no single source carries all six: BLS has no
  // selenium column at all, and USDA has iodine for 0.5% of foods and no chromium
  // or molybdenum. An absent key means "this source never measured it" — it is
  // never written as 0, which would claim the food contains none. See
  // $lib/fitness/traceMinerals for how totals are summed over that gap.
  copper?: number;     // mg
  manganese?: number;  // mg
  iodine?: number;     // mcg
  selenium?: number;   // mcg
  chromium?: number;   // mcg
  molybdenum?: number; // mcg
  // vitaminA is retinol *activity* equivalents (RAE) from every source. `retinol`
  // is the preformed share of it, kept separately because the tolerable upper
  // intake level applies to that alone — carotenoids are not capped, so judging
  // total vitamin A against the UL overstates it.
  vitaminA: number; retinol?: number;
  vitaminC: number; vitaminD: number; vitaminE: number;
  vitaminK: number; thiamin: number; riboflavin: number; niacin: number;
  vitaminB6: number; vitaminB12: number; folate: number; cholesterol: number;
  pantothenicAcid?: number; // B5, mg
  // B7, mcg. Optional because coverage splits by source: BLS measures it for 94% of
  // its foods, USDA for 13% of the imported ones, so an absent key is "unmeasured"
  // rather than "none".
  biotin?: number;
  // mg. USDA measures it; BLS has no caffeine column at all, so its coffees, teas,
  // colas and chocolates borrow the figure from an explicitly matched USDA record,
  // and its milk-coffee drinks are estimated from a stated shot-per-serving recipe
  // (CAFFEINE_FROM_USDA / CAFFEINE_ESTIMATED in scripts/import-bls-nutrition.ts).
  // Everything else from BLS leaves the key absent, meaning "no figure".
  caffeine?: number;
  // Carbohydrate detail (g). BLS reports all three for ~98% of its foods; USDA for
  // a third to a half of the imported ones.
  starch?: number; fructose?: number; lactose?: number;
  // The two energy sources that are neither macro nor alcohol (g). Sugar alcohols
  // yield 2.4 kcal/g and organic acids 3, which is most of what a food's stated
  // energy carries beyond 4/9/4. BLS only. See $lib/fitness/nutritionMath.
  sugarAlcohols?: number; organicAcids?: number;
  // Fatty acids (g/100g). Only `saturatedFat` is universal; the rest are optional
  // because coverage varies sharply by source (see $lib/fitness/fattyAcids).
  //
  // Individual acids are stored as measured and never rolled up at write time:
  // omega-3 and omega-6 totals are summed on read, so a later importer that adds
  // one more acid improves every existing record. `omega3`/`omega6` below are the
  // *fallback* — written only by sources (OFF) that publish a total and no
  // breakdown, and ignored whenever individual acids are present.
  monounsaturatedFat?: number; polyunsaturatedFat?: number; transFat?: number;
  linoleicAcid?: number;        // 18:2 n-6
  alphaLinolenicAcid?: number;  // 18:3 n-3 (not to be confused with `alanine`)
  gammaLinolenicAcid?: number;  // 18:3 n-6
  arachidonicAcid?: number;     // 20:4 n-6
  epa?: number;                 // 20:5 n-3
  dpa?: number;                 // 22:5 n-3
  dha?: number;                 // 22:6 n-3
  // Minor members of both families. BLS reports all three for every food, so
  // mapping them makes the omega sums exact rather than approximate; USDA has no
  // n-6-specific 20:3 figure, so that key stays absent for USDA-sourced foods.
  stearidonicAcid?: number;          // 18:4 n-3
  eicosadienoicAcid?: number;        // 20:2 n-6
  dihomoGammaLinolenicAcid?: number; // 20:3 n-6
  omega3?: number; omega6?: number; // source-published totals; fallback only
  // Ethanol (g/100 g). An absent key reads as "none" rather than "unmeasured" — the
  // opposite of the trace minerals above, and safe because a food's alcohol content
  // is never in doubt for the ~99% of the tables that are not drinks. BLS publishes
  // it for every food and so always writes it; USDA and Open Food Facts carry it
  // only for the drinks, hence optional.
  //
  // Carries the calories the macros cannot: ethanol is 7 kcal/g and is neither
  // protein, fat nor carbohydrate, so a beer's stated energy is roughly four times
  // its Atwater sum. See $lib/fitness/nutritionMath.
  alcohol?: number;
  // Amino acids (g/100g) — available from BLS, partially from USDA
  isoleucine?: number; leucine?: number; lysine?: number; methionine?: number;
  phenylalanine?: number; threonine?: number; tryptophan?: number; valine?: number;
  histidine?: number; alanine?: number; arginine?: number; asparticAcid?: number;
  cysteine?: number; glutamicAcid?: number; glycine?: number; proline?: number;
  serine?: number; tyrosine?: number;
};

// Nutrition mapping for calorie/macro tracking per ingredient
export type NutritionMapping = {
  sectionIndex: number;
  ingredientIndex: number;
  ingredientName?: string;
  ingredientNameDe?: string;
  source?: 'bls' | 'usda' | 'manual';
  fdcId?: number;
  blsCode?: string;
  nutritionDbName?: string;
  matchConfidence?: number;
  matchMethod: 'exact' | 'embedding' | 'manual' | 'none';
  gramsPerUnit?: number;
  /** True when the line stated no amount and one was assumed. Display only —
   *  `defaultAmount` carries the number the arithmetic uses. */
  defaultAmountUsed?: boolean;
  /** Units assumed for a line that states no amount: half a teaspoon of a spice,
   *  a tablespoon of oil. Absent on mappings written before it was recorded, which
   *  is why `ingredientUnits` still falls back to one whole unit. */
  defaultAmount?: number;
  unitConversionSource: 'direct' | 'density' | 'usda_portion' | 'estimate' | 'manual' | 'none';
  manuallyEdited: boolean;
  excluded: boolean;
  per100g?: NutritionPer100g;
  recipeRef?: string;
  recipeRefMultiplier?: number;
};

// Movable liturgical anchors usable as range endpoints. Fixed feasts
// (Christmas, Epiphany, etc.) are expressed as `{kind:'fixed', m, d}`.
export type SeasonAnchorKey =
  | 'easter'
  | 'ash-wednesday'
  | 'palm-sunday'
  | 'pentecost'
  | 'advent-i';

export type SeasonEndpoint =
  | { kind: 'fixed'; m: number; d: number }
  | { kind: 'liturgical'; anchor: SeasonAnchorKey; offsetDays: number };

export type SeasonRange = {
  start: SeasonEndpoint;
  end: SeasonEndpoint;
};

// Translation status enum
export type TranslationStatus = 'pending' | 'approved' | 'needs_update';

// Translation metadata for tracking changes
export type TranslationMetadata = {
  lastModifiedGerman?: Date;
  fieldsModifiedSinceTranslation?: string[];
};

// Ingredient discriminated union types
export type IngredientSection = {
  name?: string;
  type: 'section';
  list: {
    name: string;
    unit: string;
    amount: string;
  }[];
};

export type IngredientReference = {
  name?: string;
  type: 'reference';
  baseRecipeRef: string; // ObjectId as string
  includeIngredients: boolean;
  showLabel: boolean;
  labelOverride?: string;
  baseMultiplier?: number;
  itemsBefore?: {
    name: string;
    unit: string;
    amount: string;
  }[];
  itemsAfter?: {
    name: string;
    unit: string;
    amount: string;
  }[];
  // Populated after server-side resolution
  resolvedRecipe?: {
    _id: string;
    name: string;
    short_name: string;
    ingredients?: IngredientSection[];
    translations?: {
      en?: {
        ingredients?: IngredientItem[];
      };
    };
  };
};

export type IngredientItem = IngredientSection | IngredientReference;

// Instruction discriminated union types
export type InstructionSection = {
  name?: string;
  type: 'section';
  steps: string[];
};

export type InstructionReference = {
  name?: string;
  type: 'reference';
  baseRecipeRef: string; // ObjectId as string
  includeInstructions: boolean;
  showLabel: boolean;
  labelOverride?: string;
  baseMultiplier?: number;
  stepsBefore?: string[];
  stepsAfter?: string[];
  // Populated after server-side resolution
  resolvedRecipe?: {
    _id: string;
    name: string;
    short_name: string;
    instructions?: InstructionSection[];
    translations?: {
      en?: {
        instructions?: InstructionItem[];
      };
    };
  };
};

export type InstructionItem = InstructionSection | InstructionReference;

// Translated recipe type (English version)
export type TranslatedRecipeType = {
  short_name: string;
  name: string;
  description: string;
  preamble?: string;
  addendum?: string;
  note?: string;
  category: string;
  tags?: string[];
  portions?: string;
  preparation?: string;
  cooking?: string;
  total_time?: string;
  baking?: {
    temperature?: string;
    length?: string;
    mode?: string;
  };
  fermentation?: {
    bulk?: string;
    final?: string;
  };
  ingredients?: IngredientItem[];
  instructions?: InstructionItem[];
  images?: [{
    alt: string;
    caption?: string;
  }];
  translationStatus: TranslationStatus;
  lastTranslated?: Date;
  changedFields?: string[];
};

// Full recipe model with translations
export type RecipeModelType = {
  _id: string;
  short_name: string;
  name: string;
  category: string;
  icon: string;
  dateCreated: Date;
  dateModified: Date;
  images?: [{
	  mediapath: string;
	  alt: string;
	  caption?: string;
	  /** Blurred `data:` URI placeholder — see $lib/server/lqip. */
	  blur?: string;
  }];
  description: string;
  tags: [string];
  seasonRanges?: SeasonRange[];
  baking?: {
	  temperature: string;
	  length: string;
	  mode: string;
  }
  preparation?: string;
  fermentation?:{
	  bulk: string;
	  final: string;
	}
  portions?: string;
  defaultForm?: {
    shape: 'round' | 'rectangular' | 'gugelhupf';
    diameter?: number;
    width?: number;
    length?: number;
    innerDiameter?: number;
  };
  cooking?: string;
  total_time?: string;
  ingredients?: IngredientItem[];
  instructions?: InstructionItem[];
  preamble?: String
  addendum?: string
  note?: string;
  isBaseRecipe?: boolean;
  nutritionMappings?: NutritionMapping[];
  /**
   * Nutrition summed over the whole recipe and divided back down to 100 g,
   * cached because it costs a table lookup per ingredient. Absent means "never
   * calculated"; explicit null means "calculated, nothing usable" — the recipe
   * listing relies on that distinction to avoid recalculating dead ends.
   */
  cachedPer100g?: Partial<NutritionPer100g> | null;
  cachedTotalGrams?: number;
  translations?: {
    en?: TranslatedRecipeType;
  };
  translationMetadata?: TranslationMetadata;
};

export type BriefRecipeType = {
	_id: string;
	short_name: string;
	name: string;
	category: string;
	icon: string;
	dateCreated: Date;
	dateModified: Date;
	images?: [{
		mediapath: string;
		alt: string;
		caption?: string;
		/** Blurred `data:` URI placeholder — see $lib/server/lqip. */
		blur?: string;
	}]
	description: string;
	tags: [string];
	seasonRanges?: SeasonRange[];
	portions?: string;
	/** Macro split + energy, for listing filters. Null when never calculated. */
	macros?: import('$lib/js/recipeMacros').RecipeMacros | null;
}

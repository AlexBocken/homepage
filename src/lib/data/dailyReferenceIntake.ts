/**
 * Daily Reference Intake (DRI) values for micronutrients.
 * Sources: WHO, EFSA, US DRI (IOM).
 * Values are daily recommended amounts for adults.
 * Units match NutritionPer100g: vitamins in mcg/mg as stored, minerals in mg.
 */

export type DRI = {
  // Macros (g)
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugars: number; // max recommended
  // Fatty acids (g). EFSA/DGE express these as a share of energy rather than an
  // absolute mass, so they are resolved here at the same reference energy the
  // `fat` figure above uses — 2000 kcal male, 1600 kcal female. A person eating
  // well away from that will see targets that are proportionally off, which is the
  // same caveat the existing macro targets already carry.
  saturatedFat: number;       // max, 10% of energy
  transFat: number;           // max, 1% of energy
  linoleicAcid: number;       // 4% of energy (EFSA adequate intake)
  alphaLinolenicAcid: number; // 0.5% of energy (EFSA adequate intake)
  epaDha: number;             // 250 mg/day combined (EFSA adequate intake)
  // Minerals (mg)
  calcium: number;
  iron: number;
  magnesium: number;
  phosphorus: number;
  potassium: number;
  sodium: number; // max recommended
  zinc: number;
  // Trace minerals. Copper and manganese are stored in mg like the minerals above;
  // the rest in mcg, which is the unit their reference values are stated in.
  copper: number;     // mg
  manganese: number;  // mg
  iodine: number;     // mcg
  selenium: number;   // mcg
  chromium: number;   // mcg
  molybdenum: number; // mcg
  // Vitamins
  vitaminA: number;   // mcg RAE
  vitaminC: number;   // mg
  vitaminD: number;   // mcg
  vitaminE: number;   // mg
  vitaminK: number;   // mcg
  thiamin: number;    // mg
  riboflavin: number; // mg
  niacin: number;     // mg
  vitaminB6: number;  // mg
  vitaminB12: number; // mcg
  folate: number;     // mcg
  pantothenicAcid: number; // mg — adequate intake, no RDA was set
  biotin: number;     // mcg — adequate intake, no RDA was set
  cholesterol: number; // mg max
  // Ethanol (g), a ceiling and never a target. The DGE/SGE tolerable daily amount:
  // 20 g for men, 10 g for women — roughly half a litre and a quarter litre of beer.
  // No health authority states a *recommended* intake, and the WHO's position is
  // that no level is risk-free, so a bar at 100% here means "at the upper limit
  // health guidance tolerates", not "requirement met".
  alcohol: number; // g max
};

/** DRI for adult males (19-50) */
export const DRI_MALE: DRI = {
  protein: 56,
  fat: 78,         // ~35% of 2000 kcal
  carbs: 300,
  fiber: 38,
  sugars: 50,      // WHO max free sugars
  saturatedFat: 22,       // 10% of 2000 kcal
  transFat: 2.2,          // 1% of 2000 kcal
  linoleicAcid: 8.9,      // 4% of 2000 kcal
  alphaLinolenicAcid: 1.1, // 0.5% of 2000 kcal
  epaDha: 0.25,
  calcium: 1000,
  iron: 8,
  magnesium: 420,
  phosphorus: 700,
  potassium: 3400,
  sodium: 2300,
  zinc: 11,
  copper: 0.9,
  manganese: 2.3,  // adequate intake, not an RDA
  iodine: 150,
  selenium: 55,
  chromium: 35,    // adequate intake, not an RDA
  molybdenum: 45,
  vitaminA: 900,
  vitaminC: 90,
  vitaminD: 15,
  vitaminE: 15,
  vitaminK: 120,
  thiamin: 1.2,
  riboflavin: 1.3,
  niacin: 16,
  vitaminB6: 1.3,
  vitaminB12: 2.4,
  folate: 400,
  pantothenicAcid: 5,
  biotin: 30,
  cholesterol: 300,
  alcohol: 20,
};

/** DRI for adult females (19-50) */
export const DRI_FEMALE: DRI = {
  protein: 46,
  fat: 62,         // ~35% of 1600 kcal
  carbs: 250,
  fiber: 25,
  sugars: 50,
  saturatedFat: 18,        // 10% of 1600 kcal
  transFat: 1.8,           // 1% of 1600 kcal
  linoleicAcid: 7.1,       // 4% of 1600 kcal
  alphaLinolenicAcid: 0.9, // 0.5% of 1600 kcal
  epaDha: 0.25,
  calcium: 1000,
  iron: 18,
  magnesium: 320,
  phosphorus: 700,
  potassium: 2600,
  sodium: 2300,
  zinc: 8,
  copper: 0.9,
  manganese: 1.8,  // adequate intake, not an RDA
  iodine: 150,
  selenium: 55,
  chromium: 25,    // adequate intake, not an RDA
  molybdenum: 45,
  vitaminA: 700,
  vitaminC: 75,
  vitaminD: 15,
  vitaminE: 15,
  vitaminK: 90,
  thiamin: 1.1,
  riboflavin: 1.1,
  niacin: 14,
  vitaminB6: 1.3,
  vitaminB12: 2.4,
  folate: 400,
  pantothenicAcid: 5,
  biotin: 30,
  cholesterol: 300,
  alcohol: 10,
};

/** Energy the fatty acid reference values above are expressed at, by sex. */
export const REFERENCE_ENERGY = { male: 2000, female: 1600 } as const;

/**
 * Fatty acid references EFSA and the DGE state as a share of energy. These scale
 * with what a person actually eats: a 10%-of-energy saturated fat ceiling is 22 g
 * at 2000 kcal but 33 g at 3000. EPA+DHA is deliberately absent — its 250 mg/day
 * adequate intake is an absolute amount, not a proportion, and must not scale.
 */
const ENERGY_SCALED: (keyof DRI)[] = [
  'saturatedFat', 'transFat', 'linoleicAcid', 'alphaLinolenicAcid',
];

/**
 * Get DRI values by sex, optionally rescaled to a real energy intake.
 *
 * `energyKcal` should be the person's calorie *goal*, not their basal metabolic
 * rate: these are percentages of energy consumed, and BMR is resting expenditure —
 * typically 30-40% below intake, which would set the ceilings far too low. Passing
 * nothing keeps the 2000/1600 kcal reference, which is the right fallback when no
 * goal has been set.
 */
export function getDRI(sex: 'male' | 'female', energyKcal?: number | null): DRI {
  const base = sex === 'female' ? DRI_FEMALE : DRI_MALE;
  if (!energyKcal || energyKcal <= 0) return base;

  const ratio = energyKcal / REFERENCE_ENERGY[sex];
  const scaled = { ...base };
  for (const k of ENERGY_SCALED) {
    // One decimal: trans fat lands near 2 g, where rounding to whole grams would
    // move the ceiling by half.
    scaled[k] = Math.round(base[k] * ratio * 10) / 10;
  }
  return scaled;
}

/**
 * Nutrients the diary shows that have no daily *requirement* to state.
 *
 * Some are ceilings (caffeine, preformed retinol), some are composition detail the
 * bars break down rather than judge (starch, the two sugars), and two are energy
 * sources that belong to no macro. They carry a label and a unit like everything
 * else, so the breakdown pages work on them, but no DRI — a bar against a target
 * that does not exist would be an invention.
 */
export type ExtraNutrientKey =
  | 'retinol'
  | 'caffeine'
  | 'starch'
  | 'fructose'
  | 'lactose'
  | 'sugarAlcohols'
  | 'organicAcids';

/**
 * Nutrients whose bar is a share of a larger figure they are part of, rather than
 * of a requirement they do not have.
 *
 * Without this the rows draw an empty bar and read 'N/A', which says nothing —
 * and the interesting question about each of them is compositional anyway: how
 * much of the vitamin A came preformed, how much of the sugar was fructose or
 * lactose, how much of the carbohydrate was starch. Each denominator is the figure
 * the nutrient is literally part of, so the share can never exceed 100%.
 *
 * Starch is measured against carbohydrate rather than against sugars: BLS counts
 * available carbohydrate as sugars + starch + oligosaccharides, so sugars is its
 * sibling, not its parent — a slice of bread would otherwise read 1500%.
 */
export const RELATIVE_TO: Partial<Record<keyof DRI | ExtraNutrientKey, string>> = {
  retinol: 'vitaminA',
  fructose: 'sugars',
  lactose: 'sugars',
  starch: 'carbs',
};

/**
 * Tolerable Upper Intake Levels (UL) for adults, NASEM/IOM — habitual intake above
 * these carries a risk of harm. Only nutrients whose UL applies to *total* intake are
 * listed: the ULs for magnesium, niacin, vitamin E, vitamin B6 and folate cover
 * supplements and fortification only, so food-log totals must not be judged against
 * them. Units match DRI.
 */
export const UPPER_LIMITS: Partial<Record<keyof DRI | ExtraNutrientKey, number>> = {
  calcium: 2500,
  iron: 45,
  phosphorus: 4000,
  zinc: 40,
  // Trace minerals. All four cover intake from food as well as supplements, so a
  // food log can legitimately be judged against them. Chromium has no UL — the
  // evidence was judged insufficient to set one, which is not the same as safe at
  // any dose — so it is deliberately absent rather than listed with a guess.
  copper: 10,
  manganese: 11,
  iodine: 1100,
  selenium: 400,
  molybdenum: 2000,
  vitaminC: 2000,
  vitaminD: 100,
  // The vitamin A UL covers *preformed* retinol only — β-carotene and the other
  // provitamin carotenoids are not capped, because the body regulates how much of
  // them it converts. Judging total vitamin A (RAE, carotenoids included) against
  // 3000 mcg flagged carrot-heavy days as an overdose they were not, so the limit
  // is stated against retinol and only foods reporting it are measured by it.
  retinol: 3000, // mcg preformed
  // EFSA: 400 mg/day habitual intake is without safety concern for healthy adults
  // (200 mg in one sitting, which a daily total cannot see).
  caffeine: 400, // mg
};

/** WHO essential amino acid requirements for adults, in mg per kg body weight per day */
export const AMINO_DRI_PER_KG = {
  histidine: 10, isoleucine: 20, leucine: 39, lysine: 30,
  methionine: 15, phenylalanine: 25, threonine: 15, tryptophan: 4, valine: 26,
};

/** Body weight the amino acid requirements fall back to when none is known */
export const AMINO_DRI_REFERENCE_WEIGHT = 70;

/** Daily requirement of an essential amino acid in grams, or 0 if it has none */
export function aminoDri(key: string, weightKg: number): number {
  const perKg = AMINO_DRI_PER_KG[key as keyof typeof AMINO_DRI_PER_KG];
  return perKg ? (perKg * weightKg) / 1000 : 0;
}

/** Nutrient display metadata: label, unit, and whether it's a max (upper limit) */
export const NUTRIENT_META: Record<keyof DRI | ExtraNutrientKey, { label: string; labelDe: string; unit: string; isMax?: boolean }> = {
  protein:     { label: 'Protein',      labelDe: 'Eiweiss',        unit: 'g' },
  fat:         { label: 'Fat',          labelDe: 'Fett',          unit: 'g' },
  carbs:       { label: 'Carbs',        labelDe: 'Kohlenhydrate', unit: 'g' },
  fiber:       { label: 'Fiber',        labelDe: 'Ballaststoffe', unit: 'g' },
  sugars:      { label: 'Sugars',       labelDe: 'Zucker',        unit: 'g', isMax: true },
  saturatedFat:       { label: 'Saturated fat', labelDe: 'Gesättigte Fettsäuren', unit: 'g', isMax: true },
  transFat:           { label: 'Trans fat',     labelDe: 'Trans-Fettsäuren',      unit: 'g', isMax: true },
  linoleicAcid:       { label: 'Linoleic acid (n-6)', labelDe: 'Linolsäure (n-6)', unit: 'g' },
  alphaLinolenicAcid: { label: 'α-Linolenic acid (n-3)', labelDe: 'α-Linolensäure (n-3)', unit: 'g' },
  epaDha:             { label: 'EPA + DHA',     labelDe: 'EPA + DHA',             unit: 'g' },
  calcium:     { label: 'Calcium',      labelDe: 'Kalzium',       unit: 'mg' },
  iron:        { label: 'Iron',         labelDe: 'Eisen',         unit: 'mg' },
  magnesium:   { label: 'Magnesium',    labelDe: 'Magnesium',     unit: 'mg' },
  phosphorus:  { label: 'Phosphorus',   labelDe: 'Phosphor',      unit: 'mg' },
  potassium:   { label: 'Potassium',    labelDe: 'Kalium',        unit: 'mg' },
  sodium:      { label: 'Sodium',       labelDe: 'Natrium',       unit: 'mg', isMax: true },
  zinc:        { label: 'Zinc',         labelDe: 'Zink',          unit: 'mg' },
  copper:      { label: 'Copper',       labelDe: 'Kupfer',        unit: 'mg' },
  manganese:   { label: 'Manganese',    labelDe: 'Mangan',        unit: 'mg' },
  iodine:      { label: 'Iodine',       labelDe: 'Jod',           unit: 'mcg' },
  selenium:    { label: 'Selenium',     labelDe: 'Selen',         unit: 'mcg' },
  chromium:    { label: 'Chromium',     labelDe: 'Chrom',         unit: 'mcg' },
  molybdenum:  { label: 'Molybdenum',   labelDe: 'Molybdän',      unit: 'mcg' },
  vitaminA:    { label: 'Vitamin A',    labelDe: 'Vitamin A',     unit: 'mcg' },
  vitaminC:    { label: 'Vitamin C',    labelDe: 'Vitamin C',     unit: 'mg' },
  vitaminD:    { label: 'Vitamin D',    labelDe: 'Vitamin D',     unit: 'mcg' },
  vitaminE:    { label: 'Vitamin E',    labelDe: 'Vitamin E',     unit: 'mg' },
  vitaminK:    { label: 'Vitamin K',    labelDe: 'Vitamin K',     unit: 'mcg' },
  thiamin:     { label: 'Thiamin (B1)', labelDe: 'Thiamin (B1)',  unit: 'mg' },
  riboflavin:  { label: 'Riboflavin (B2)', labelDe: 'Riboflavin (B2)', unit: 'mg' },
  niacin:      { label: 'Niacin (B3)',  labelDe: 'Niacin (B3)',   unit: 'mg' },
  vitaminB6:   { label: 'Vitamin B6',   labelDe: 'Vitamin B6',   unit: 'mg' },
  vitaminB12:  { label: 'Vitamin B12',  labelDe: 'Vitamin B12',  unit: 'mcg' },
  folate:      { label: 'Folate',       labelDe: 'Folsäure',     unit: 'mcg' },
  pantothenicAcid: { label: 'Pantothenic acid (B5)', labelDe: 'Pantothensäure (B5)', unit: 'mg' },
  biotin:      { label: 'Biotin (B7)',  labelDe: 'Biotin (B7)',  unit: 'mcg' },
  retinol:     { label: 'Retinol',      labelDe: 'Retinol',      unit: 'mcg', isMax: true },
  caffeine:    { label: 'Caffeine',     labelDe: 'Koffein',      unit: 'mg', isMax: true },
  starch:      { label: 'Starch',       labelDe: 'Stärke',       unit: 'g' },
  fructose:    { label: 'Fructose',     labelDe: 'Fructose',     unit: 'g' },
  lactose:     { label: 'Lactose',      labelDe: 'Lactose',      unit: 'g' },
  sugarAlcohols: { label: 'Sugar alcohols', labelDe: 'Zuckeralkohole', unit: 'g' },
  organicAcids:  { label: 'Organic acids',  labelDe: 'Organische Säuren', unit: 'g' },
  cholesterol: { label: 'Cholesterol',  labelDe: 'Cholesterin',  unit: 'mg', isMax: true },
  alcohol:     { label: 'Alcohol',      labelDe: 'Alkohol',      unit: 'g',  isMax: true },
};

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
  // Minerals (mg)
  calcium: number;
  iron: number;
  magnesium: number;
  phosphorus: number;
  potassium: number;
  sodium: number; // max recommended
  zinc: number;
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
  cholesterol: number; // mg max
};

/** DRI for adult males (19-50) */
export const DRI_MALE: DRI = {
  protein: 56,
  fat: 78,         // ~35% of 2000 kcal
  carbs: 300,
  fiber: 38,
  sugars: 50,      // WHO max free sugars
  calcium: 1000,
  iron: 8,
  magnesium: 420,
  phosphorus: 700,
  potassium: 3400,
  sodium: 2300,
  zinc: 11,
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
  cholesterol: 300,
};

/** DRI for adult females (19-50) */
export const DRI_FEMALE: DRI = {
  protein: 46,
  fat: 62,         // ~35% of 1600 kcal
  carbs: 250,
  fiber: 25,
  sugars: 50,
  calcium: 1000,
  iron: 18,
  magnesium: 320,
  phosphorus: 700,
  potassium: 2600,
  sodium: 2300,
  zinc: 8,
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
  cholesterol: 300,
};

/** Get DRI values by sex */
export function getDRI(sex: 'male' | 'female'): DRI {
  return sex === 'female' ? DRI_FEMALE : DRI_MALE;
}

/** Nutrient display metadata: label, unit, and whether it's a max (upper limit) */
export const NUTRIENT_META: Record<keyof DRI, { label: string; labelDe: string; unit: string; isMax?: boolean }> = {
  protein:     { label: 'Protein',      labelDe: 'Eiweiß',        unit: 'g' },
  fat:         { label: 'Fat',          labelDe: 'Fett',          unit: 'g' },
  carbs:       { label: 'Carbs',        labelDe: 'Kohlenhydrate', unit: 'g' },
  fiber:       { label: 'Fiber',        labelDe: 'Ballaststoffe', unit: 'g' },
  sugars:      { label: 'Sugars',       labelDe: 'Zucker',        unit: 'g', isMax: true },
  calcium:     { label: 'Calcium',      labelDe: 'Kalzium',       unit: 'mg' },
  iron:        { label: 'Iron',         labelDe: 'Eisen',         unit: 'mg' },
  magnesium:   { label: 'Magnesium',    labelDe: 'Magnesium',     unit: 'mg' },
  phosphorus:  { label: 'Phosphorus',   labelDe: 'Phosphor',      unit: 'mg' },
  potassium:   { label: 'Potassium',    labelDe: 'Kalium',        unit: 'mg' },
  sodium:      { label: 'Sodium',       labelDe: 'Natrium',       unit: 'mg', isMax: true },
  zinc:        { label: 'Zinc',         labelDe: 'Zink',          unit: 'mg' },
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
  cholesterol: { label: 'Cholesterol',  labelDe: 'Cholesterin',  unit: 'mg', isMax: true },
};

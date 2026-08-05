/**
 * The order micronutrients are listed in, shared by every display that shows them.
 *
 * Vitamins follow the grouping nutrition labelling has settled on — EU FIC
 * (Reg. 1169/2011, Annex XIII) and the US Nutrition Facts panel agree on it: the
 * four fat-soluble vitamins as a block, then the water-soluble ones. Within the
 * B complex the order is the numbering, B1 → B12, rather than the sequence the
 * regulations happen to list it in. Both of them run B1, B2, B3, B6, B9, B12,
 * B7, B5, which reads as unsorted to anyone who knows the numbers, and the
 * numbers are printed on every supplement bottle.
 *
 * Retinol is not a vitamin in its own right: it is the preformed share of
 * vitamin A, the part the tolerable upper limit applies to. It follows its
 * parent rather than taking a place in the sequence.
 *
 * Every display filters this list rather than reordering it, so a page that
 * cannot show a nutrient still shows the rest in the same relative order.
 */

/** Minerals every source measures. Trace elements live in `traceMinerals.ts`. */
export const MINERAL_ORDER = [
	'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
];

/** Fat-soluble (A, D, E, K) → vitamin C → the B complex by number. */
export const VITAMIN_ORDER = [
	'vitaminA', 'retinol', 'vitaminD', 'vitaminE', 'vitaminK',
	'vitaminC',
	'thiamin',          // B1
	'riboflavin',       // B2
	'niacin',           // B3
	'pantothenicAcid',  // B5
	'vitaminB6',
	'biotin',           // B7
	'folate',           // B9
	'vitaminB12',
];

/**
 * Neither macro nor micronutrient: cholesterol plus three figures that are
 * ceilings rather than targets. Alcohol and caffeine sit here because theirs are
 * the rows whose bar filling up is not an achievement.
 */
export const OTHER_ORDER = ['cholesterol', 'caffeine', 'alcohol', 'sugarAlcohols'];

/**
 * The `OTHER_ORDER` keys worth a row only when the food actually contains some.
 * A '0 g alcohol' line under an apple is noise, not information — a running total
 * over a whole day is the one place all four always belong.
 */
export const OTHER_WHEN_PRESENT = ['caffeine', 'alcohol', 'sugarAlcohols'];

/** Carbohydrate detail, shown as a share of the figure each is part of. */
export const CARB_DETAIL_ORDER = ['starch', 'fructose', 'lactose'];

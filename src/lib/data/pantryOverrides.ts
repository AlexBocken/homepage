/**
 * Corrections to what the pantry search infers from ingredient names (see
 * `$lib/server/pantryIndex`), plus the basics it starts out assuming.
 *
 * The inference is "Puderzucker ends with Zucker and its translation ends with
 * sugar, so having Puderzucker covers a recipe that asks for Zucker". That is
 * right for nearly every compound; these are the ones where the compound is a
 * different food. Review `pnpm exec vite-node scripts/pantry-vocabulary-report.ts`
 * after adding recipes and add a pair here when a link is wrong.
 *
 * Keys are the cleaned, lowercase German names ($lib/js/pantryNames).
 */

/** `[have, needed]`: having the first must NOT count as having the second. */
export const NOT_COVERS: [string, string][] = [
	['kokosnussmilch', 'milch'],
	['kokosmilch', 'milch'],
	['kondensmilch', 'milch'],
	['hirschhornsalz', 'salz'],
	['hefenährsalz', 'salz'],
	['rosenwasser', 'wasser'],
	['frischkäse', 'käse'],
	['cayennepfeffer', 'pfeffer'],
	['stärkewasser', 'wasser'],
	['mayonnaise mit mehr senf', 'senf'],
];

/** `[have, needed]`: links no naming rule can find — the parts of an egg,
 *  garlic by the bulb or the clove, and fresh and dry yeast, which the recipe
 *  page already swaps for each other (HefeSwapper). */
export const EXTRA_COVERS: [string, string][] = [
	['knoblauch', 'knoblauchzehe'],
	['knoblauchzehe', 'knoblauch'],
	['frischhefe', 'trockenhefe'],
	['trockenhefe', 'frischhefe'],
	['ei', 'dotter'],
	['ei', 'eidotter'],
	['ei', 'eigelb'],
	['ei', 'eiweiss'],
	['ei', 'eiklar'],
];

/** Compound endings that are made *from* the first part: having Zitrone covers
 *  Zitronensaft and Zitronenschale. */
export const DERIVED_SUFFIXES = ['saft', 'schale', 'abrieb', 'zeste'];

/** What the page assumes you have until you change it. Keys missing from the
 *  current vocabulary are ignored. */
export const DEFAULT_BASICS = [
	'salz',
	'pfeffer',
	'zucker',
	'weissmehl',
	'butter',
	'öl',
	'olivenöl',
	'wasser',
	'backpulver',
	'trockenhefe',
	'vanillezucker',
	'puderzucker',
	'stärke',
	'essig',
	'muskat',
	'zimt',
	'paprika',
	'lorbeerblätter',
	'nelken',
];

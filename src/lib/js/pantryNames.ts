/**
 * From a recipe's ingredient line to the thing you'd have in your pantry.
 *
 * "Butter, weich" → butter; "Schale einer Zitrone" → zitrone;
 * "Buttermilch (alternativ: Milch)" → buttermilch or milch;
 * "<a href=sauerteigansatz>Sauerteigansatz</a>" → sauerteigansatz, linked.
 *
 * The pantry search keys on these strings rather than on the nutrition
 * mappings: the same food is mapped to BLS in one recipe and to USDA in another,
 * while the recipe text says "Milch" in both. Plain `.ts`, no server imports —
 * the page runs the matching in the browser.
 */
import { STRIP_MODIFIERS, STRIP_MODIFIERS_DE } from '$lib/data/ingredientModifiers';
import { parseAnchorRecipeRef } from '$lib/js/recipeRefs';

export type PantryLang = 'de' | 'en';

export type CleanedLine = {
	/** Alternatives — having any one of them is enough. Empty for a line that
	 *  isn't an ingredient (an instruction that ended up in the list). */
	keys: string[];
	/** Garnish, "nach Bedarf", "(optional)": never required. */
	optional: boolean;
	/** The recipe a linked line points at, as its slug. */
	ref: string | null;
};

/** Size and state words the nutrition matcher's lists don't carry (it matches
 *  against food tables, where they don't occur). */
const EXTRA_MODIFIERS_DE = [
	'handwarm', 'mittelgross', 'gross', 'reif', 'reife', 'geschält', 'ungeschält', 'abgetropft',
	'gekühlt', 'weiche', 'kalte', 'warme', 'feine', 'frische', 'getrocknete', 'gemahlener',
	'gehackte', 'ganze', 'kleine', 'grosse', 'mittelgrosse', 'geräuchert', 'gewaschen',
	// Swiss spelling of the matcher's "heiß" (ß-ok)
	'heiss', 'heisse', 'heisser', 'heisses',
];
const EXTRA_MODIFIERS_EN = ['softened', 'cold', 'lukewarm', 'room-temperature', 'ripe', 'drained'];

const OPTIONAL_DE = /\b(optional|nach bedarf|nach belieben|nach geschmack|zum (garnieren|bestreuen|servieren|bestäuben|ausstreichen|einfetten|dekorieren))\b/i;
const OPTIONAL_EN = /\b(optional|to taste|as needed|for (garnish|garnishing|serving|greasing|dusting|decoration))\b/i;

/** "(alternativ: Milch)", "(alt. Milch)", "(oder Milch)", "(or milk)" */
const ALTERNATIVE_NOTE = /\(\s*(?:alternati?v(?:e|ely)?|alt\.|oder|or)\s*:?\s*([^)]*)\)/gi;
const SPLIT_DE = /\s+oder\s+|\s+bzw\.?\s+|\s*\/\s*/i;
const SPLIT_EN = /\s+or\s+|\s*\/\s*/i;

const UNITS =
	'g|kg|mg|ml|cl|dl|l|el|tl|msp|prise|prisen|stk|stück|pkg|päckchen|tasse|tassen|bund|zehe|zehen|' +
	'cup|cups|tbsp|tsp|oz|lb|pinch|clove|cloves';
/** "90 g Zucker", "3-4 Eier", "½ TL Salz" */
const LEADING_AMOUNT = new RegExp(String.raw`^[\d\s.,/½¼¾⅓⅔⅛%\-–]+(?:(?:${UNITS})\b\.?)?\s*`, 'i');
/** "Schale einer Zitrone", "Saft von 2 Orangen", "juice of a lemon" */
const PART_OF_DE = /^(?:saft|schale|abrieb|zeste)n?\s+(?:einer|eines|einem|von(?:\s+(?:einer|einem|\d+|ca\.?\s*\d+))?)\s+/;
const PART_OF_EN = /^(?:juice|zest|peel|rind)\s+of\s+(?:an?\s+|the\s+|one\s+|half\s+an?\s+|\d+\s+)?/;
const LEADING_FILLER_DE =
	/^(?:ca\.?|etwa|ein|eine|einer|eines|wenig|viel|reichlich|auch|das restliche|der restliche|die restliche|restliche[rns]?|optional:?)\s+/;
const LEADING_FILLER_EN = /^(?:approx\.?|about|a|an|one|some|plenty of|the remaining|optional:?)\s+/;

/** A key longer than this, or with sentence punctuation, is prose, not food. */
const MAX_WORDS = 4;

const modifierSets = {
	de: buildModifierMatcher([...STRIP_MODIFIERS_DE, ...EXTRA_MODIFIERS_DE]),
	en: buildModifierMatcher([...STRIP_MODIFIERS, ...EXTRA_MODIFIERS_EN]),
};

function buildModifierMatcher(words: string[]) {
	const single = new Set(words.filter((w) => !w.includes(' ')).map((w) => w.toLowerCase()));
	const phrases = words.filter((w) => w.includes(' ')).map((w) => w.toLowerCase());
	return { single, phrases };
}

function stripModifiers(name: string, lang: PantryLang): string {
	const { single, phrases } = modifierSets[lang];
	let s = ` ${name} `;
	for (const phrase of phrases) s = s.split(` ${phrase} `).join(' ');
	return s
		.trim()
		.split(/\s+/)
		.filter((word) => !single.has(word))
		.join(' ');
}

/** "Wasser zum Bedecken", "Butter für die Form", "oil for frying": what it's
 *  for is not what it is. */
const PURPOSE = /\s+(?:zum|zur|für|for|to)\s+.*$/;

function cleanAlternative(text: string, lang: PantryLang): string | null {
	let s = text.split(',')[0].toLowerCase().trim().replace(PURPOSE, '');
	s = s.replace(LEADING_AMOUNT, '');
	s = s.replace(lang === 'de' ? LEADING_FILLER_DE : LEADING_FILLER_EN, '');
	s = s.replace(lang === 'de' ? PART_OF_DE : PART_OF_EN, '');
	s = s.replace(LEADING_AMOUNT, '');
	s = stripModifiers(s, lang);
	s = s.replace(/["'“”„‚‘’«»]/g, '').replace(/[\s:;-]+$/, '').replace(/\s+/g, ' ').trim();
	if (!s || /[.:;!?]/.test(s) || s.split(' ').length > MAX_WORDS) return null;
	return s;
}

export function cleanIngredientLine(raw: string, lang: PantryLang): CleanedLine {
	const ref = parseAnchorRecipeRef(raw ?? '');
	let s = (raw ?? '')
		.replace(/&shy;/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	const optional = (lang === 'de' ? OPTIONAL_DE : OPTIONAL_EN).test(s);

	const noted: string[] = [];
	s = s.replace(ALTERNATIVE_NOTE, (_, alternative: string) => {
		noted.push(alternative);
		return ' ';
	});
	s = s.replace(/\([^)]*\)?/g, ' ');

	const parts = [...s.split(lang === 'de' ? SPLIT_DE : SPLIT_EN), ...noted];
	const keys = [...new Set(parts.map((p) => cleanAlternative(p, lang)).filter((k): k is string => !!k))];
	return { keys, optional, ref };
}

/**
 * The noun an English ingredient name is about, singular: "white flour" →
 * flour, "cherries" → cherry. Two German names whose translations share a head
 * are the same kind of thing — the check that keeps "Kirschen" (cherries) from
 * being merged into "Kirsch" (the schnapps) and "Knoblauch" (garlic) from
 * counting as a "Lauch" (leek).
 */
export function englishHead(name: string): string {
	const word = name.toLowerCase().replace(/["'“”]/g, '').trim().split(/\s+/).pop() ?? '';
	if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
	if (/(ches|shes|sses|xes|oes)$/.test(word)) return word.slice(0, -2);
	if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
	return word;
}

/** "weissmehl" → "Weissmehl": keys are stored lowercase, nouns are shown capitalised. */
export function displayLabel(key: string): string {
	return key.charAt(0).toUpperCase() + key.slice(1);
}

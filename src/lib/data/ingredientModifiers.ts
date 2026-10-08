/**
 * Words that describe how an ingredient is prepared or sized rather than what
 * it is — "fein gehackt", "lauwarm", "mittelgross". Stripped before an
 * ingredient name is matched: by the nutrition matcher against the BLS/USDA
 * tables, and by the pantry search against the other recipes' ingredients.
 */

/** Modifiers to strip from ingredient names before matching */
export const STRIP_MODIFIERS = [
	'warm', 'cold', 'hot', 'room temperature', 'lukewarm',
	'fresh', 'freshly', 'dried', 'dry',
	'finely', 'coarsely', 'roughly', 'thinly',
	'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded',
	'crushed', 'ground', 'whole', 'halved', 'quartered',
	'peeled', 'unpeeled', 'pitted', 'seeded', 'deseeded',
	'melted', 'softened', 'frozen', 'thawed', 'chilled',
	'toasted', 'roasted', 'blanched', 'boiled', 'steamed',
	'sifted', 'packed', 'loosely packed', 'firmly packed',
	'small', 'medium', 'large', 'extra-large',
	'organic', 'free-range', 'grass-fed',
	'optional', 'to taste', 'as needed', 'for garnish', 'for serving',
	'about', 'approximately', 'roughly',
];

/** German modifiers to strip */
export const STRIP_MODIFIERS_DE = [
	'warm', 'kalt', 'heiß', 'lauwarm', 'zimmerwarm', // ß-ok: matches German-German recipes
	'frisch', 'getrocknet', 'trocken',
	'fein', 'grob', 'dünn',
	'gehackt', 'gewürfelt', 'geschnitten', 'gerieben', 'geraspelt',
	'gemahlen', 'ganz', 'halbiert', 'geviertelt',
	'geschält', 'entkernt', 'entsteint',
	'geschmolzen', 'weich', 'gefroren', 'aufgetaut', 'gekühlt',
	'geröstet', 'blanchiert', 'gekocht', 'gedämpft',
	'gesiebt',
	'klein', 'mittel', 'groß', // ß-ok
	'bio', 'optional', 'nach Geschmack', 'nach Bedarf', 'zum Garnieren',
	'etwa', 'ungefähr', 'ca',
];

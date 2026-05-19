/**
 * Swiss-canton lookup. `resolveCanton(name)` takes whatever the Swisstopo
 * reverse-geocode returns (German is the default, but French/Italian names
 * surface for Romandie / Ticino hikes) and resolves it to a stable record
 * carrying the ISO code, a short label for tooltips, and the URL of the
 * pre-downloaded coat-of-arms SVG.
 *
 * The 26 SVGs live in `static/cantons/<iso-code>.svg` — fetched once by
 * `scripts/download-cantons.ts` and committed.
 */

export type Canton = {
	/** ISO 3166-2:CH code, lowercase (e.g. 'ar'). */
	code: string;
	/** Canonical German name (matches the `static/cantons/` filename map). */
	name: string;
	/** Short label used in tooltips / compact UIs. */
	abbr: string;
	/** Absolute URL of the coat-of-arms SVG. */
	emblemUrl: string;
};

// Tuple format keeps the file compact: [code, German name, short abbr, ...alternate names].
// Alternates cover French/Italian renderings that Swisstopo occasionally returns
// for cantons with multiple official languages, plus the few historic spellings.
const CANTON_TABLE: ReadonlyArray<readonly [string, string, string, ...string[]]> = [
	['ag', 'Aargau', 'AG'],
	['ai', 'Appenzell Innerrhoden', 'AI'],
	['ar', 'Appenzell Ausserrhoden', 'AR'],
	['be', 'Bern', 'BE', 'Berne'],
	['bl', 'Basel-Landschaft', 'BL', 'Bâle-Campagne'],
	['bs', 'Basel-Stadt', 'BS', 'Bâle-Ville'],
	['fr', 'Freiburg', 'FR', 'Fribourg'],
	['ge', 'Genf', 'GE', 'Genève', 'Geneva'],
	['gl', 'Glarus', 'GL'],
	['gr', 'Graubünden', 'GR', 'Grigioni', 'Grischun', 'Grisons'],
	['ju', 'Jura', 'JU'],
	['lu', 'Luzern', 'LU', 'Lucerne'],
	['ne', 'Neuenburg', 'NE', 'Neuchâtel'],
	['nw', 'Nidwalden', 'NW'],
	['ow', 'Obwalden', 'OW'],
	['sg', 'St. Gallen', 'SG', 'Sankt Gallen', 'Saint-Gall', 'San Gallo'],
	['sh', 'Schaffhausen', 'SH', 'Schaffhouse'],
	['so', 'Solothurn', 'SO', 'Soleure'],
	['sz', 'Schwyz', 'SZ'],
	['tg', 'Thurgau', 'TG', 'Thurgovie'],
	['ti', 'Tessin', 'TI', 'Ticino'],
	['ur', 'Uri', 'UR'],
	['vd', 'Waadt', 'VD', 'Vaud'],
	['vs', 'Wallis', 'VS', 'Valais', 'Vallese'],
	['zg', 'Zug', 'ZG', 'Zoug'],
	['zh', 'Zürich', 'ZH', 'Zurich', 'Zurigo']
];

// Normalise for lookup: strip accents, lowercase, collapse whitespace.
// Lets "St. Gallen" / "Sankt Gallen" / "saint-gall" all match the same entry.
function normalise(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/gi, ' ')
		.trim()
		.toLowerCase();
}

const BY_NAME = new Map<string, Canton>();
for (const [code, name, abbr, ...alts] of CANTON_TABLE) {
	const canton: Canton = {
		code,
		name,
		abbr,
		emblemUrl: `/cantons/${code}.svg`
	};
	BY_NAME.set(normalise(name), canton);
	for (const alt of alts) BY_NAME.set(normalise(alt), canton);
	// Also accept the ISO code itself (`'AR'`, `'ar'`).
	BY_NAME.set(normalise(code), canton);
}

/** Resolve a free-form canton name (any official language) to a Canton
 * record. Returns null if the name doesn't match a known canton — caller
 * should fall back to plain text without the emblem. */
export function resolveCanton(name: string | null | undefined): Canton | null {
	if (!name) return null;
	return BY_NAME.get(normalise(name)) ?? null;
}

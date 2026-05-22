/**
 * Country lookup for hikes outside Switzerland. `resolveCountry(name)` takes
 * an ISO 3166-1 alpha-2 code (what the build-time geocoder emits) or a
 * free-form country name (any common language) and resolves it to a stable
 * record with the code, a German display name, and the flag SVG URL.
 *
 * The flags live in `static/countries/<code>.svg` (lowercase ISO code).
 * Swiss hikes are grouped by canton instead — see `resolveHikeArea`.
 */

export type Country = {
	/** ISO 3166-1 alpha-2 code, uppercase (e.g. 'DE'). */
	code: string;
	/** German display name. */
	name: string;
	/** Absolute URL of the flag SVG. */
	flagUrl: string;
};

// [code, German name, ...alternate names / spellings the geocoder may return].
const COUNTRY_TABLE: ReadonlyArray<readonly [string, string, ...string[]]> = [
	['CH', 'Schweiz', 'Switzerland', 'Suisse', 'Svizzera', 'Svizra'],
	['DE', 'Deutschland', 'Germany', 'Allemagne', 'Germania'],
	['IT', 'Italien', 'Italy', 'Italia', 'Italie'],
	['AT', 'Österreich', 'Austria', 'Autriche', 'Oesterreich'],
	['FR', 'Frankreich', 'France', 'Francia'],
	['LI', 'Liechtenstein']
];

function normalise(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/gi, ' ')
		.trim()
		.toLowerCase();
}

const BY_NAME = new Map<string, Country>();
for (const [code, name, ...alts] of COUNTRY_TABLE) {
	const country: Country = { code, name, flagUrl: `/countries/${code.toLowerCase()}.svg` };
	BY_NAME.set(normalise(name), country);
	BY_NAME.set(normalise(code), country);
	for (const alt of alts) BY_NAME.set(normalise(alt), country);
}

/** Resolve an ISO code or free-form country name to a Country, or null if
 * unknown (only the prepared Alpine-region countries are listed). */
export function resolveCountry(name: string | null | undefined): Country | null {
	if (!name) return null;
	return BY_NAME.get(normalise(name)) ?? null;
}

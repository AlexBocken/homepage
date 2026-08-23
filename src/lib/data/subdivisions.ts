/**
 * Sub-national region lookup for hikes abroad — the counterpart to
 * `cantons.ts`, which covers Switzerland from the Swisstopo geocode.
 *
 * `resolveSubdivision(country, name)` takes an ISO 3166-1 alpha-2 country code
 * and whatever OSM/Nominatim returned as `address.state`, and resolves it to a
 * record with a stable code, a German display name, and the URL of its
 * coat-of-arms SVG.
 *
 * The arms live in `static/regions/<cc>/states/<code>.svg` — the same tree that
 * holds the country flags at `<cc>/<cc>.svg`.
 *
 * Only countries whose arms have actually been added are listed; anything else
 * resolves to null and the hike falls back to its country flag.
 */

export type Subdivision = {
	/** Stable slug, matching the SVG filename. */
	code: string;
	/** ISO 3166-1 alpha-2 code of the country it belongs to, uppercase. */
	country: string;
	/** German display name. */
	name: string;
	/** Absolute URL of the coat-of-arms SVG. */
	emblemUrl: string;
};

// [country, code/filename, German name, ...alternate names the geocoder may
// return]. The ISO 3166-2 code is listed as an alternate so a lookup keyed on
// Nominatim's `ISO3166-2-lvl4` works as well as one keyed on the name.
const SUBDIVISION_TABLE: ReadonlyArray<readonly [string, string, string, ...string[]]> = [
	['AT', 'burgenland', 'Burgenland', 'AT-1'],
	['AT', 'kaernten', 'Kärnten', 'AT-2', 'Carinthia', 'Karnten'],
	['AT', 'niederoesterreich', 'Niederösterreich', 'AT-3', 'Lower Austria', 'Niederoesterreich'],
	['AT', 'oberoesterreich', 'Oberösterreich', 'AT-4', 'Upper Austria', 'Oberoesterreich'],
	['AT', 'salzburg', 'Salzburg', 'AT-5'],
	['AT', 'steiermark', 'Steiermark', 'AT-6', 'Styria'],
	['AT', 'tirol', 'Tirol', 'AT-7', 'Tyrol'],
	['AT', 'vorarlberg', 'Vorarlberg', 'AT-8'],
	['AT', 'wien', 'Wien', 'AT-9', 'Vienna', 'Vienne']
];

function normalise(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/gi, ' ')
		.trim()
		.toLowerCase();
}

// Keyed by `<country>|<normalised name>` so two countries can share a region
// name without colliding (Tirol exists either side of the Brenner).
const BY_KEY = new Map<string, Subdivision>();
for (const [country, code, name, ...alts] of SUBDIVISION_TABLE) {
	const sub: Subdivision = {
		code,
		country,
		name,
		emblemUrl: `/regions/${country.toLowerCase()}/states/${code}.svg`
	};
	for (const key of [code, name, ...alts]) BY_KEY.set(`${country}|${normalise(key)}`, sub);
}

/**
 * Resolve a country code plus a region name to a Subdivision, or null when the
 * country has no arms on file or the name is unknown.
 */
export function resolveSubdivision(
	country: string | null | undefined,
	name: string | null | undefined
): Subdivision | null {
	if (!country || !name) return null;
	return BY_KEY.get(`${country.toUpperCase()}|${normalise(name)}`) ?? null;
}

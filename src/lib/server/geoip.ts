/**
 * Which departure hub to show a reader before they've told us.
 *
 * The lookup itself is nginx's. `ngx_http_geoip2_module` reads the MaxMind
 * GeoIP2 City database already on the box and hands the result over as request
 * headers, so Node never opens an .mmdb, no npm reader is installed, and no
 * visitor IP is sent anywhere. See `docs/NGINX_GEOIP.md` for the config, which
 * has to exist for any of this to do anything.
 *
 * What comes back is a guess and is treated as one. Fixed-line IPs land within
 * a few kilometres, which resolves eleven hubs across Switzerland comfortably;
 * mobile ones are behind carrier NAT and routinely land 200 km off, which
 * across a country this size means anywhere. So the hub is always shown as a
 * named, changeable thing ("ab Zürich ⌄") rather than folded silently into
 * a number, and an explicit choice — the `hikes_hub` cookie — always wins.
 */

import { DEFAULT_HUB_ID, hubById, hubForLocation, isHubId } from '$lib/hikes/hubs';
import type { HubId } from '$types/hikes';

/** Set by nginx from the GeoIP2 database. Empty when it has no answer. */
const LAT_HEADER = 'x-geo-lat';
const LON_HEADER = 'x-geo-lon';
const COUNTRY_HEADER = 'x-geo-country';

/** Name of the cookie holding the reader's own choice. Underscore, not the
 * colon the rest of this app's storage keys use: RFC 6265 forbids `:` in a
 * cookie name and `cookies.set` throws on it. */
export const HUB_COOKIE = 'hikes_hub';

export type HubSource =
	/** The reader picked it. */
	| 'cookie'
	/** Nearest hub to where their IP says they are. */
	| 'geoip'
	/** Nothing known — or nothing near enough to be worth claiming. */
	| 'default';

export type ResolvedHub = {
	id: HubId;
	source: HubSource;
	/** ISO country from the same lookup, where nginx supplied one. Not used for
	 * the choice — a reader in Konstanz is closer to a Swiss hub than to
	 * anything German this site knows — but it explains an odd guess in a log. */
	country: string | null;
};

function headerNumber(headers: Headers, name: string): number | null {
	const raw = headers.get(name);
	if (!raw) return null;
	const n = Number(raw.trim());
	return Number.isFinite(n) ? n : null;
}

/**
 * The hub for this request: the reader's own choice if they've made one, else
 * the nearest hub to what GeoIP2 says, else the default.
 *
 * `cookieValue` is passed in rather than read here so this stays a pure
 * function of the request — it is the one piece worth unit-testing, and
 * `cookies.get` needs a whole SvelteKit event to exist.
 */
export function resolveHub(
	headers: Headers,
	cookieValue: string | null | undefined,
	/** `?hub=` — how the picker changes hubs with no script running. */
	paramValue?: string | null
): ResolvedHub {
	const country = headers.get(COUNTRY_HEADER)?.trim() || null;

	if (isHubId(paramValue)) {
		return { id: paramValue, source: 'cookie', country };
	}
	if (isHubId(cookieValue)) {
		return { id: cookieValue, source: 'cookie', country };
	}

	const lat = headerNumber(headers, LAT_HEADER);
	const lng = headerNumber(headers, LON_HEADER);
	if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
		const hub = hubForLocation(lat, lng);
		if (hub) return { id: hub.id, source: 'geoip', country };
	}

	return { id: DEFAULT_HUB_ID, source: 'default', country };
}

/** Sanity-check helper for callers that took a hub id from somewhere untrusted. */
export function coerceHubId(value: string | null | undefined): HubId {
	return hubById(value)?.id ?? DEFAULT_HUB_ID;
}

/**
 * The departure hub the reader is currently looking at, once they've changed it.
 *
 * Deliberately only the *override*: the initial value comes from the server
 * (`hikes/+layout.server.ts` — their cookie, or a guess from GeoIP2) and is read
 * straight off `page.data`. A module-level rune is per-process on the server, so
 * seeding one during SSR would leak one visitor's hub into the next visitor's
 * render. Starting at `null` keeps the server rendering the request's own value
 * and the first client render agreeing with it.
 *
 * Switching hubs needs no round trip — every hub's leg is already in the
 * generated table. The cookie is written only so the *next* page load starts
 * where this one ended up.
 */

import { browser } from '$app/environment';
import { page } from '$app/state';
import { DEFAULT_HUB_ID, isHubId } from './hubs';
import type { HubId } from '$types/hikes';

// Underscore, not a colon: RFC 6265 forbids `:` in a cookie name, and the
// server half (`$lib/server/geoip`) throws outright when asked to set one.
const COOKIE = 'hikes_hub';
const ONE_YEAR = 60 * 60 * 24 * 365;

let override = $state<HubId | null>(null);

/** The reader's in-page choice, or `null` while they haven't made one. */
export function hubOverride(): HubId | null {
	return override;
}

/**
 * The hub every estimate on the page is measured from: the reader's own choice
 * if they've made one this session, otherwise whatever the server resolved for
 * this request.
 *
 * Reading `page.data` here rather than in each component keeps the listing and
 * the detail pages agreeing — change hubs on a hike page, go back to /hikes,
 * and the cards are already showing the new one without a round trip.
 */
export function activeHub(): HubId {
	return override ?? (page.data.travelHub?.id as HubId | undefined) ?? DEFAULT_HUB_ID;
}

/**
 * The hub a filtered listing is measured from: the one named in the filter if
 * the reader picked it there, otherwise the resolved one. Both the page and the
 * filter bar go through this so their bounds cannot drift apart — a slider
 * whose track came from a different hub than the filter state would show an
 * untouched range as narrowed.
 */
export function hubFor(explicit: HubId | null | undefined): HubId {
	return explicit ?? activeHub();
}

export function setHub(id: HubId): void {
	if (!isHubId(id)) return;
	override = id;
	if (!browser) return;
	// Lax rather than Strict: arriving from a link to a hike is exactly when
	// this matters, and it is a display preference, not a credential.
	document.cookie = `${COOKIE}=${id}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

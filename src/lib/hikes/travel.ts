/**
 * Reading the precomputed travel-time table (`scripts/build-hike-travel.ts`).
 *
 * An estimate is the hub leg plus `Hub.accessMin` for getting to the hub —
 * except at Flims, where the hub is a village bus stop and its only users are
 * already standing at it.
 *
 * Three outcomes, kept apart on purpose: a time, "the timetable had nothing"
 * (the trailhead is not reachable from there at that hour, which is real
 * information about the hike), and "we don't know" (the leg was never fetched,
 * or failed). Collapsing the last two would put words in the timetable's mouth.
 *
 * The table is passed in rather than imported: it is a static asset the routes
 * fetch in `load` (see `HIKE_TRAVEL_URL`), because it grows as hubs × hikes and
 * every kilobyte of it would otherwise be paid for by every visitor of /hikes.
 * A missing table is simply "we don't know" — the pages render without it.
 */

import { hubById, type Hub } from './hubs';
import { fmt, m, type HikesLang } from '$lib/js/hikesI18n';
import type { HikeTravelEndpoint, HikeTravelLeg, HikeTravelTable, HubId } from '$types/hikes';

export type TravelDirection = 'toStart' | 'fromEnd';

export type TravelEstimate =
	| {
			state: 'ok';
			hub: Hub;
			endpoint: HikeTravelEndpoint;
			leg: HikeTravelLeg;
			/** Hub leg plus the reader's assumed leg to the hub. */
			totalMin: number;
			/** The assumed leg itself, so the page can show its own workings. */
			accessMin: number;
	  }
	| { state: 'unreachable'; hub: Hub; endpoint: HikeTravelEndpoint }
	| { state: 'unknown' };

const UNKNOWN: TravelEstimate = { state: 'unknown' };

export function travelEstimate(
	table: HikeTravelTable | null | undefined,
	slug: string | null | undefined,
	hubId: HubId,
	direction: TravelDirection
): TravelEstimate {
	if (!table || !slug) return UNKNOWN;
	const entry = table.hikes[slug];
	const hub = hubById(hubId);
	if (!entry || !hub) return UNKNOWN;

	const endpoint = direction === 'toStart' ? entry.start : entry.end;
	if (!endpoint) return UNKNOWN;

	// Absent key: never asked, or the request failed. Present but null: asked,
	// and there was no connection.
	if (!(hubId in entry[direction])) return UNKNOWN;
	const leg = entry[direction][hubId];
	if (!leg) return { state: 'unreachable', hub, endpoint };

	return {
		state: 'ok',
		hub,
		endpoint,
		leg,
		accessMin: hub.accessMin,
		totalMin: leg.durationMin + hub.accessMin
	};
}

/** The date the table was sampled for — a hint that it is a Saturday's
 * timetable and, when it drifts, that it is last season's. */
export function travelSampledFor(
	table: HikeTravelTable | null | undefined,
	slug: string | null | undefined
): string | null {
	if (!table || !slug) return null;
	return table.hikes[slug]?.sampledFor ?? null;
}

/** `135` → `"2 h 15"`, `45` → `"45 min"`. Rounded to five minutes above an
 * hour: the input is one sampled Saturday, and a to-the-minute total would
 * claim a precision the method doesn't have. */
export function formatTravelMinutes(min: number): string {
	if (min < 60) return `${Math.max(1, Math.round(min / 5) * 5)} min`;
	const rounded = Math.round(min / 5) * 5;
	const h = Math.floor(rounded / 60);
	const m = rounded % 60;
	return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export function transfersLabel(n: number, lang: HikesLang = 'de'): string {
	const t = m[lang];
	return n === 0 ? t.direct : n === 1 ? t.transfer_one : fmt(t.transfers_n, { n });
}

/**
 * The departure hubs public-transport estimates are measured from.
 *
 * Eleven of them stand in for the whole country. A reader is assumed to reach
 * their hub in `accessMin`, and everything past that comes from a leg fetched
 * once at build time (`scripts/build-hike-travel.ts`) — so a hike page can show
 * "ab Zürich ca. 2 h 10" without a timetable query per visitor.
 *
 * `station` is the name the timetable uses, verified against
 * `transport.opendata.ch/v1/locations`; `id` is its UIC/didok number, kept for
 * humans checking the table rather than for the queries (which go by name, the
 * way `JourneyPlanner` does).
 */

import type { HubId } from '$types/hikes';

export type Hub = {
	id: HubId;
	/** Exact timetable name — what gets sent to `/v1/connections`. */
	station: string;
	/**
	 * How it reads on the page — the **city**, not the station.
	 *
	 * "Anreise ab Zürich" is what the estimate actually claims: the reader is
	 * somewhere in that agglomeration and `accessMin` covers getting to a
	 * platform. "Ab Zürich HB" would name a spot on a concourse nobody is
	 * standing on yet, and quietly promise a precision the number doesn't have.
	 * The exact station name lives in `station`, where the timetable needs it.
	 */
	label: string;
	/** Station id, for eyeballing the generated table against the timetable. */
	stationId: string;
	lat: number;
	lng: number;
	/**
	 * Assumed minutes from the reader to this hub. Thirty everywhere but Flims:
	 * these are stations serving whole agglomerations, and getting to the
	 * platform from somewhere in one is its own trip. Flims Waldhaus Promenada
	 * is a village bus stop — the only people picking it are already in Flims,
	 * and charging them half an hour to walk to the Promenada would be
	 * inventing a journey they don't make.
	 */
	accessMin: number;
};

export const HUBS: readonly Hub[] = [
	{ id: 'zurich', station: 'Zürich HB', label: 'Zürich', stationId: '8503000', lat: 47.377847, lng: 8.540502, accessMin: 30 },
	{ id: 'bern', station: 'Bern', label: 'Bern', stationId: '8507000', lat: 46.948823, lng: 7.439123, accessMin: 30 },
	{ id: 'basel', station: 'Basel SBB', label: 'Basel', stationId: '8500010', lat: 47.547403, lng: 7.589564, accessMin: 30 },
	{ id: 'chur', station: 'Chur', label: 'Chur', stationId: '8509000', lat: 46.853078, lng: 9.528926, accessMin: 30 },
	{ id: 'luzern', station: 'Luzern', label: 'Luzern', stationId: '8505000', lat: 47.050165, lng: 8.310172, accessMin: 30 },
	{ id: 'stgallen', station: 'St. Gallen', label: 'St. Gallen', stationId: '8506302', lat: 47.423171, lng: 9.369888, accessMin: 30 },
	{ id: 'zug', station: 'Zug', label: 'Zug', stationId: '8502204', lat: 47.173693, lng: 8.515046, accessMin: 30 },
	{ id: 'lausanne', station: 'Lausanne', label: 'Lausanne', stationId: '8501120', lat: 46.516795, lng: 6.629087, accessMin: 30 },
	{ id: 'geneve', station: 'Genève', label: 'Genève', stationId: '8501008', lat: 46.210228, lng: 6.142435, accessMin: 30 },
	{ id: 'lugano', station: 'Lugano', label: 'Lugano', stationId: '8505300', lat: 46.005494, lng: 8.946993, accessMin: 30 },
	{
		id: 'flims',
		station: 'Flims Waldhaus, Promenada',
		label: 'Flims',
		stationId: '8574681',
		lat: 46.829774,
		lng: 9.28584,
		accessMin: 0
	}
] as const;

/** Falls back here when nothing is known about the reader: the busiest station
 * in the country, and the one most of this site's readers actually start from. */
export const DEFAULT_HUB_ID: HubId = 'zurich';

export function hubById(id: string | null | undefined): Hub | null {
	if (!id) return null;
	return HUBS.find((h) => h.id === id) ?? null;
}

export function isHubId(id: string | null | undefined): id is HubId {
	return !!id && HUBS.some((h) => h.id === id);
}

/** Great-circle distance in km. Duplicated from `$lib/gpx`'s `haversineKm`
 * rather than imported, so this module stays free of the GPX parser for the
 * sake of a handful of coordinates. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
	const R = 6371;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(bLat - aLat);
	const dLng = toRad(bLng - aLng);
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Nearest hub as the crow flies.
 *
 * Straight-line distance, not travel time: from Zug the crow says Zürich and so
 * does the timetable, and where the two would disagree (Interlaken is nearer
 * Bern by rail than by air) the reader can say so themselves. Picking by
 * precomputed travel time instead would need the very matrix this is choosing
 * an entry point into.
 */
export function nearestHub(lat: number, lng: number): { hub: Hub; km: number } {
	let best = HUBS[0];
	let bestKm = Infinity;
	for (const hub of HUBS) {
		const km = haversineKm(lat, lng, hub.lat, hub.lng);
		if (km < bestKm) {
			bestKm = km;
			best = hub;
		}
	}
	return { hub: best, km: bestKm };
}

/**
 * Furthest a reader can be from a hub for "your hub is 30 minutes away" to be
 * worth saying. Every inhabited part of Switzerland is inside it; Munich and
 * Milan are not, and for a reader there the nearest hub geometrically is not a
 * hub they'd use — better to fall back to the default and let them pick.
 */
export const HUB_CATCHMENT_KM = 150;

/** The hub a location belongs to, or `null` when it belongs to none of them. */
export function hubForLocation(lat: number, lng: number): Hub | null {
	const { hub, km } = nearestHub(lat, lng);
	return km <= HUB_CATCHMENT_KM ? hub : null;
}

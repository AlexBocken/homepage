/**
 * "In der Nähe": the hikes whose start area is closest to this one, as the crow flies
 * between the manifest centroids. A hike with nothing inside the radius gets
 * no neighbours — a card 200 km away is not "nearby", it is just the next
 * entry in the list, and the listing already has that.
 */
import type { HikeManifestEntry } from '$types/hikes';

export const NEARBY_RADIUS_KM = 40;
export const NEARBY_MAX = 3;

export type NearbyHike = { hike: HikeManifestEntry; distanceKm: number };

const R = 6371;

/** Great-circle distance between two `[lat, lng]` points, in km. */
export function crowFliesKm(a: [number, number], b: [number, number]): number {
	const dLat = ((b[0] - a[0]) * Math.PI) / 180;
	const dLng = ((b[1] - a[1]) * Math.PI) / 180;
	const la1 = (a[0] * Math.PI) / 180;
	const la2 = (b[0] * Math.PI) / 180;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearbyHikes(
	all: readonly HikeManifestEntry[],
	slug: string,
	opts: { radiusKm?: number; max?: number } = {}
): NearbyHike[] {
	const radius = opts.radiusKm ?? NEARBY_RADIUS_KM;
	const max = opts.max ?? NEARBY_MAX;
	const here = all.find((h) => h.slug === slug);
	if (!here) return [];
	return all
		.filter((h) => h.slug !== slug && !h.hidden)
		.map((hike) => ({ hike, distanceKm: crowFliesKm(here.centroid, hike.centroid) }))
		.filter((n) => n.distanceKm <= radius)
		.sort((a, b) => a.distanceKm - b.distanceKm || a.hike.slug.localeCompare(b.hike.slug))
		.slice(0, max);
}

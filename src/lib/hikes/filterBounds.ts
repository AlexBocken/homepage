import type { HikeManifestEntry, HikeTravelTable, HubId } from '$types/hikes';
import { DEFAULT_HUB_ID } from './hubs';
import { travelEstimate } from './travel';

// Shared min/max derivation for the hikes range filters, so the slider track
// extents (HikesFilterBar) and the page's default filter state (+page.svelte)
// always agree — otherwise a thumb could sit off-track or a phantom "active"
// chip could appear on first paint.

export type Bounds = { min: number; max: number };

export const DISTANCE_STEP = 1;
export const DURATION_STEP = 15;
export const ELEVATION_STEP = 50;
export const TRAVEL_STEP = 15;

/** Data floor/ceiling for a metric, snapped outward to whole `step` units so
 * the slider ends land on clean values. Always returns min < max. */
export function alignBounds(values: number[], step: number): Bounds {
	if (values.length === 0) return { min: 0, max: step };
	const lo = Math.min(...values);
	const hi = Math.max(...values);
	const min = Math.floor(lo / step) * step;
	let max = Math.ceil(hi / step) * step;
	if (max <= min) max = min + step;
	return { min, max };
}

export type HikeFilterBounds = {
	distance: Bounds;
	duration: Bounds;
	gain: Bounds;
	loss: Bounds;
	/** Public-transport travel time to the trailhead, including the flat
	 * allowance for reaching the hub. Unlike the others this one moves with the
	 * departure hub — the spread from Zurich is not the spread from Lugano — so
	 * every caller has to pass the same hub or the slider track and the filter
	 * state will disagree about where "not narrowed" is. */
	travel: Bounds;
};

/**
 * `hub` and `travel` only affect the `travel` bounds; the rest are properties
 * of the route. Both are optional so callers that never touch that range (and
 * the tests that predate it) keep working unchanged — without the table the
 * travel bounds collapse to a degenerate range, which reads as "nothing to
 * filter by" rather than as an error.
 */
export function hikeFilterBounds(
	hikes: HikeManifestEntry[],
	hub: HubId = DEFAULT_HUB_ID,
	travel?: HikeTravelTable | null
): HikeFilterBounds {
	// Only hikes the timetable can actually reach in time contribute. A hike
	// with no answer must not drag the ceiling to zero, and it is excluded from
	// the filter itself for the same reason.
	const travelTimes: number[] = [];
	for (const h of hikes) {
		const est = travelEstimate(travel, h.slug, hub, 'toStart');
		if (est.state === 'ok') travelTimes.push(est.totalMin);
	}

	return {
		travel: alignBounds(travelTimes, TRAVEL_STEP),
		distance: alignBounds(
			hikes.map((h) => h.distanceKm),
			DISTANCE_STEP
		),
		duration: alignBounds(
			hikes.map((h) => h.durationMin ?? 0),
			DURATION_STEP
		),
		gain: alignBounds(
			hikes.map((h) => h.elevationGainM),
			ELEVATION_STEP
		),
		loss: alignBounds(
			hikes.map((h) => h.elevationLossM),
			ELEVATION_STEP
		)
	};
}

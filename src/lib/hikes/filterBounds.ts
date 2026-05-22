import type { HikeManifestEntry } from '$types/hikes';

// Shared min/max derivation for the hikes range filters, so the slider track
// extents (HikesFilterBar) and the page's default filter state (+page.svelte)
// always agree — otherwise a thumb could sit off-track or a phantom "active"
// chip could appear on first paint.

export type Bounds = { min: number; max: number };

export const DISTANCE_STEP = 1;
export const DURATION_STEP = 15;
export const ELEVATION_STEP = 50;

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
};

export function hikeFilterBounds(hikes: HikeManifestEntry[]): HikeFilterBounds {
	return {
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

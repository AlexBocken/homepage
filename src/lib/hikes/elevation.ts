/**
 * Shared elevation analytics for the hikes pipeline.
 *
 * The build script and the route-builder both need to derive
 * gain / loss / range from a track's `<ele>` values. Keeping a single
 * implementation here guarantees the live preview in the builder reports
 * the same numbers the published detail page will show after a deploy.
 */

export interface HasAltitude {
	altitude?: number;
}

/** Moving-average window for altitude denoising (in trkpts). */
export const ELEV_SMOOTH_WINDOW = 5;

/** Discard altitude deltas below this many metres — eliminates GPS
 * jitter from being counted as real gain/loss. */
export const ELEV_MIN_STEP_M = 3;

/**
 * Returns the smoothed altitude per trkpt. Entries are `null` for indices
 * where no defined altitude exists in the ±half window — the previous
 * behaviour (defaulting to 0) silently turned missing `<ele>` tags into
 * huge synthetic gain spikes against the next real altitude.
 */
export function smoothAltitudes(track: HasAltitude[]): (number | null)[] {
	const n = track.length;
	const out = new Array<number | null>(n);
	const half = Math.floor(ELEV_SMOOTH_WINDOW / 2);
	for (let i = 0; i < n; i++) {
		let sum = 0;
		let count = 0;
		for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
			const a = track[j].altitude;
			if (typeof a === 'number') {
				sum += a;
				count++;
			}
		}
		out[i] = count > 0 ? sum / count : null;
	}
	return out;
}

export function computeElevationStats(track: HasAltitude[]): { gain: number; loss: number } {
	if (track.length < 2) return { gain: 0, loss: 0 };
	const altitudes = smoothAltitudes(track);
	let gain = 0;
	let loss = 0;
	let prev: number | null = null;
	for (const a of altitudes) {
		if (a === null) continue;
		if (prev === null) {
			prev = a;
			continue;
		}
		const diff = a - prev;
		if (diff >= ELEV_MIN_STEP_M) {
			gain += diff;
			prev = a;
		} else if (diff <= -ELEV_MIN_STEP_M) {
			loss += -diff;
			prev = a;
		}
	}
	return { gain: Math.round(gain), loss: Math.round(loss) };
}

export function computeElevationRange(track: HasAltitude[]): {
	min: number | null;
	max: number | null;
} {
	let min = Infinity;
	let max = -Infinity;
	for (const p of track) {
		if (typeof p.altitude !== 'number') continue;
		if (p.altitude < min) min = p.altitude;
		if (p.altitude > max) max = p.altitude;
	}
	if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: null, max: null };
	return { min: Math.round(min), max: Math.round(max) };
}

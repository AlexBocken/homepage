// Per-run "best effort" splits: the fastest *continuous* K km within a GPS run,
// for every integer K that fits (1k … ⌊total⌋k). Computed once per run (cost is
// O(Kmax · points), i.e. scales with run length, not run count) and cached on
// the session, so the dashboard query is a trivial min over a stored field.

import { haversineKm } from '$lib/gpx';

export interface BestEffort {
	km: number;
	seconds: number;
	startIdx: number;
	endIdx: number;
}

interface TrackPoint {
	lat: number;
	lng: number;
	timestamp: number; // epoch ms
}

/**
 * Collect a session's GPS points. Runs store the track either at the top level
 * (`gpsTrack`, GPS-only workouts) or per cardio exercise (`exercises[].gpsTrack`).
 * Points are merged and sorted by timestamp so concatenated exercises stay in
 * chronological path order.
 */
export function gatherSessionTrack(session: {
	gpsTrack?: TrackPoint[];
	exercises?: { gpsTrack?: TrackPoint[] }[];
}): TrackPoint[] {
	const pts: TrackPoint[] = [];
	if (session.gpsTrack?.length) pts.push(...session.gpsTrack);
	for (const ex of session.exercises ?? []) if (ex.gpsTrack?.length) pts.push(...ex.gpsTrack);
	pts.sort((a, b) => a.timestamp - b.timestamp);
	return pts;
}

/**
 * For each integer K from 1 to ⌊total km⌋, the fastest continuous K-km window in
 * the track (the far end interpolated to land exactly on K km). A monotonic
 * two-pointer keeps each K at O(points).
 */
export function computeBestEfforts(track: TrackPoint[]): BestEffort[] {
	const n = track?.length ?? 0;
	if (n < 2) return [];

	// Cumulative distance (km) and elapsed time (s) along the track.
	const cumD = new Float64Array(n);
	const cumT = new Float64Array(n);
	const t0 = track[0].timestamp;
	for (let i = 1; i < n; i++) {
		cumD[i] = cumD[i - 1] + haversineKm(track[i - 1], track[i]);
		// Clamp non-monotonic timestamps so elapsed never goes backwards.
		cumT[i] = Math.max(cumT[i - 1], (track[i].timestamp - t0) / 1000);
	}

	const total = cumD[n - 1];
	const maxK = Math.floor(total);
	const out: BestEffort[] = [];

	for (let K = 1; K <= maxK; K++) {
		let best = Infinity;
		let bestStart = 0;
		let bestEnd = 0;
		let j = 1;
		for (let i = 0; i < n; i++) {
			if (j <= i) j = i + 1;
			while (j < n && cumD[j] - cumD[i] < K) j++;
			if (j >= n) break; // can't reach K km from i or any later i
			const dPrev = cumD[j - 1] - cumD[i]; // < K
			const dCur = cumD[j] - cumD[i]; // >= K
			const denom = dCur - dPrev;
			const frac = denom > 0 ? (K - dPrev) / denom : 0;
			const tEnd = cumT[j - 1] + frac * (cumT[j] - cumT[j - 1]);
			const elapsed = tEnd - cumT[i];
			if (elapsed < best) {
				best = elapsed;
				bestStart = i;
				bestEnd = j;
			}
		}
		if (best < Infinity) out.push({ km: K, seconds: Math.round(best), startIdx: bestStart, endIdx: bestEnd });
	}

	return out;
}

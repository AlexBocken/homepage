/**
 * The "nach …" label next to a hike photo.
 *
 * A day hike counts from the first track point: "nach 2 h 5 min".
 *
 * A multi-day hike counts days by stage, not by 24-hour blocks, then the time
 * since that day's stage began: "nach 1 d 1 h 34 min". Counting straight
 * through the night would label a photo from the second morning "nach 17 h".
 * Real calendar dates are no help here — the build re-bases every timestamp
 * to 08:00 on the build day for privacy — but each stage is one day, and its
 * index range says which day a track point belongs to.
 */

import type { HikeStage, HikeTrackPoint } from '$types/hikes';

const MIN = 60_000;

/** Minutes and hours only: "42 min", "2 h", "2 h 5 min". Null when negative. */
export function formatDuration(ms: number): string | null {
	if (!Number.isFinite(ms) || ms < 0) return null;
	const totalMin = Math.round(ms / MIN);
	if (totalMin < 60) return `${totalMin} min`;
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function firstTimestamp(track: HikeTrackPoint[], from: number, to: number): number | null {
	for (let i = from; i <= to && i < track.length; i++) {
		const t = track[i][3];
		if (typeof t === 'number') return t;
	}
	return null;
}

/** Index of the track point closest in time to `t`, or -1 without timestamps. */
export function nearestTrackIdx(track: HikeTrackPoint[], t: number): number {
	let best = -1;
	let bestD = Infinity;
	for (let i = 0; i < track.length; i++) {
		const pt = track[i][3];
		if (typeof pt !== 'number') continue;
		const d = Math.abs(pt - t);
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	return best;
}

/**
 * Label for a photo taken at `t`, or null when there is nothing to say.
 *
 * A photo belongs to the stage of its nearest track point in time, so one taken
 * at camp before setting off counts toward that morning's stage rather than the
 * previous evening's. Before the stage's first point it shows the day alone.
 */
export function photoElapsed(
	t: number | null | undefined,
	track: HikeTrackPoint[] | null | undefined,
	stages: HikeStage[] | null | undefined
): string | null {
	if (typeof t !== 'number' || !track || track.length === 0) return null;

	if (stages && stages.length >= 2) {
		const idx = nearestTrackIdx(track, t);
		const day = stages.findIndex((s) => idx >= s.startIdx && idx <= s.endIdx);
		if (day >= 0) {
			const start = firstTimestamp(track, stages[day].startIdx, stages[day].endIdx);
			if (start !== null) {
				const rel = t - start;
				if (day === 0) return formatDuration(rel);
				return rel >= MIN ? `${day} d ${formatDuration(rel)}` : `${day} d`;
			}
		}
	}

	const start = firstTimestamp(track, 0, track.length - 1);
	return start === null ? null : formatDuration(t - start);
}

/**
 * Walking time as the hike cards, the detail page and the duration filter
 * print it: whole hours plus leftover minutes, `"4h 5m"`, `"0h 45m"`.
 */
export function formatHikeDuration(min: number): string {
	return `${Math.floor(min / 60)}h ${min % 60}m`;
}

/** {@link formatHikeDuration}, or an em dash when no positive time is known. */
export function hikeDurationLabel(min: number | null | undefined): string {
	return min != null && min > 0 ? formatHikeDuration(min) : '—';
}

/**
 * The two numbers every cardio view reduces a session to: how far, and for how long.
 *
 * Both are read the same way the session card reads them, so a template's history and
 * the cards it is built from can never disagree: the session-level total wins when it
 * is there (it is what the tracker wrote), and the per-exercise totals are only summed
 * for older sessions that never had one.
 *
 * Kept pure and framework-free so the stats endpoints and the components share one
 * definition of "pace" rather than three.
 */

export type CardioSessionLike = {
	duration?: number | null;
	startTime?: string | Date | null;
	endTime?: string | Date | null;
	totalDistance?: number | null;
	exercises?: { totalDistance?: number | null }[] | null;
};

/** Distance covered, km. 0 when the session recorded none. */
export function cardioDistanceKm(s: CardioSessionLike): number {
	if (s.totalDistance) return s.totalDistance;
	let sum = 0;
	for (const ex of s.exercises ?? []) sum += ex?.totalDistance ?? 0;
	return sum;
}

/**
 * Duration in minutes. The stored `duration` is authoritative — it is what the timer
 * measured and what the kcal estimate used; wall-clock from start to end is only a
 * fallback for sessions saved without one.
 */
export function cardioMinutes(s: CardioSessionLike): number {
	if (s.duration) return s.duration;
	if (s.startTime && s.endTime) {
		const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
		if (Number.isFinite(ms) && ms > 0) return ms / 60000;
	}
	return 0;
}

/** Pace in min/km, or null when either half of the ratio is missing. */
export function cardioPace(s: CardioSessionLike): number | null {
	const km = cardioDistanceKm(s);
	const mins = cardioMinutes(s);
	if (km <= 0 || mins <= 0) return null;
	return mins / km;
}

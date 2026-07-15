// Detect all-time "fastest Nk" personal records set by a freshly saved run.
// Each run caches its fastest continuous K-km splits (`bestEfforts`); this
// compares those against the user's history and reports the distances on which
// the new run is now the fastest ever. Mirrors the segment-PB rule: a distance
// only counts as a PR when a PRIOR effort exists, so a user's very first run
// doesn't light up every distance as a "record".

import { WorkoutSession } from '$models/WorkoutSession';
import { backfillBestEfforts, activitiesForKind, type ActivityKind } from '$lib/server/bestEffortsBackfill';
import type { BestEffort } from '$lib/fitness/bestEfforts';

export interface BestEffortPr {
	km: number;
	seconds: number; // this run's time over the distance
	prevSeconds: number; // the previous all-time best it beat
}

/**
 * Distances on which `efforts` (a single run's best efforts) set a new best for
 * `user` *as of* the run's own start (`before`) — a PR is judged only against
 * earlier runs, so recalculating or re-snapping a historical run never counts a
 * later run against it. Compared only within the same board (`kind`) — a fast
 * ride never sets a "running PR". `sessionId` is the run itself (belt-and-braces
 * exclusion for a run sharing the exact start time).
 */
export async function detectBestEffortPrs(
	user: string,
	sessionId: unknown,
	efforts: BestEffort[],
	kind: ActivityKind,
	before: Date
): Promise<BestEffortPr[]> {
	if (!efforts?.length) return [];

	// Make sure the user's older runs have their splits cached, or the comparison
	// would silently ignore them and over-report PRs.
	await backfillBestEfforts(user);

	// Best per distance across the user's EARLIER same-board runs only.
	const rows = await WorkoutSession.aggregate([
		{
			$match: {
				createdBy: user,
				activityType: { $in: activitiesForKind(kind) },
				bestEfforts: { $exists: true },
				startTime: { $lt: before },
				_id: { $ne: sessionId }
			}
		},
		{ $unwind: '$bestEfforts' },
		{ $group: { _id: '$bestEfforts.km', best: { $min: '$bestEfforts.seconds' } } }
	]);
	const prevByKm = new Map<number, number>(rows.map((r) => [r._id as number, r.best as number]));

	const prs: BestEffortPr[] = [];
	for (const e of efforts) {
		const prev = prevByKm.get(e.km);
		if (prev !== undefined && e.seconds < prev) {
			prs.push({ km: e.km, seconds: e.seconds, prevSeconds: prev });
		}
	}
	// Longest distances first — a new 10k PR reads as more notable than the 1k it
	// necessarily also contains.
	prs.sort((a, b) => b.km - a.km);
	return prs;
}

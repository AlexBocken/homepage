// Lazy one-time backfill of WorkoutSession.bestEfforts. The fastest continuous
// K-km splits are computed from the GPS track and cached on each run, so the
// dashboard / segments queries are cheap min/aggregation lookups afterwards.

import { WorkoutSession } from '$models/WorkoutSession';
import { computeBestEfforts, gatherSessionTrack } from '$lib/fitness/bestEfforts';

// Foot activities measured in min/km — cycling is excluded so a bike ride never
// wins a "fastest Nk" by pace.
export const FOOT_ACTIVITIES = ['running', 'walking', 'hiking'];

/** Compute & store best efforts for any of the user's foot runs that lack them. */
export async function backfillBestEfforts(createdBy: string): Promise<void> {
	const pending = await WorkoutSession.find({
		createdBy,
		activityType: { $in: FOOT_ACTIVITIES },
		bestEfforts: { $exists: false }
	})
		.select('gpsTrack exercises.gpsTrack')
		.lean();
	for (const s of pending) {
		const track = gatherSessionTrack(s as Parameters<typeof gatherSessionTrack>[0]);
		const efforts = computeBestEfforts(track);
		await WorkoutSession.updateOne({ _id: s._id }, { $set: { bestEfforts: efforts } });
	}
}

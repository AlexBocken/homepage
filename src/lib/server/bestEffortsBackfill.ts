// Lazy one-time backfill of WorkoutSession.bestEfforts. The fastest continuous
// K-km splits are computed from the GPS track and cached on each run, so the
// dashboard / segments queries are cheap min/aggregation lookups afterwards.

import { WorkoutSession } from '$models/WorkoutSession';
import { computeBestEfforts, gatherSessionTrack } from '$lib/fitness/bestEfforts';

// Best efforts are kept in two separate leaderboards so a bike ride never
// competes with a run: foot activities are ranked by pace (min/km), cycling by
// speed (km/h). Walking/hiking share the running board.
export const FOOT_ACTIVITIES = ['running', 'walking', 'hiking'];
export const CYCLING_ACTIVITIES = ['cycling'];
export const BEST_EFFORT_ACTIVITIES = [...FOOT_ACTIVITIES, ...CYCLING_ACTIVITIES];

export type ActivityKind = 'running' | 'cycling';

/** Which best-effort board an activity belongs to (null = not tracked). */
export function activityKind(activityType: string | null | undefined): ActivityKind | null {
	if (activityType && FOOT_ACTIVITIES.includes(activityType)) return 'running';
	if (activityType && CYCLING_ACTIVITIES.includes(activityType)) return 'cycling';
	return null;
}

/** The activity types that make up a board. */
export function activitiesForKind(kind: ActivityKind): string[] {
	return kind === 'cycling' ? CYCLING_ACTIVITIES : FOOT_ACTIVITIES;
}

/** Compute & store best efforts for any of the user's tracked runs/rides that lack them. */
export async function backfillBestEfforts(createdBy: string): Promise<void> {
	const pending = await WorkoutSession.find({
		createdBy,
		activityType: { $in: BEST_EFFORT_ACTIVITIES },
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

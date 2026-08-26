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

/**
 * Which activity a cardio exercise stands for — the inverse of the GPS
 * workout's own `ACTIVITY_EXERCISE_MAP` (see the active-workout page). Only the
 * four outdoor activities appear: those are the ones GPS mode can produce, and
 * the only ones with a best-effort board. Indoor cardio (`cycling-indoor`,
 * `rowing-machine`, `elliptical`, …) is deliberately absent — it has no track
 * to rank, and filing a turbo session under `cycling` would put it in the same
 * lists as rides that happened outside.
 *
 * Keep this in step with that map: a new GPS activity needs both halves.
 */
export type InferredActivity = 'running' | 'walking' | 'cycling' | 'hiking';

const EXERCISE_ACTIVITY: Record<string, InferredActivity> = {
	running: 'running',
	walking: 'walking',
	'cycling-outdoor': 'cycling',
	hiking: 'hiking'
};

/** The shape `inferActivityType` reads — a session document, or anything with
 * the same few fields. */
type ActivityHints = {
	activityType?: string | null;
	mode?: string | null;
	gpsTrack?: unknown[] | null;
	exercises?: ({ exerciseId?: string | null; gpsTrack?: unknown[] | null } | null)[] | null;
};

const hasTrack = (t: unknown[] | null | undefined): boolean => Array.isArray(t) && t.length > 0;

/**
 * The activity a session should be filed under, or `null` to leave it alone.
 *
 * A run with no `activityType` is off every board — best efforts, the backfill
 * and the leaderboards all filter on it — and sessions arrive without one from
 * manual logging and from older imports. This settles it from what the session
 * does carry.
 *
 * `null` means "nothing to say", not "not an activity": a stored type is never
 * second-guessed, and a swim or a strength session is left untyped rather than
 * forced into a board it does not belong on.
 */
export function inferActivityType(session: ActivityHints): InferredActivity | null {
	// An explicit type is the user's, or an importer's, and outranks any guess.
	if (session.activityType) return null;

	const exercises = (session.exercises ?? []).filter(Boolean) as NonNullable<
		ActivityHints['exercises']
	>[number][];

	// The exercise carrying the track describes the session better than one
	// merely logged alongside it — a ride with a warm-up walk logged next to it
	// is still a ride.
	const carrying = exercises.find(
		(e) => hasTrack(e?.gpsTrack) && e?.exerciseId && EXERCISE_ACTIVITY[e.exerciseId]
	);
	if (carrying?.exerciseId) return EXERCISE_ACTIVITY[carrying.exerciseId];

	// Nothing carries a track: a cardio exercise still names the activity, even
	// if there is no route to rank.
	const named = exercises.find((e) => e?.exerciseId && EXERCISE_ACTIVITY[e.exerciseId]);
	if (named?.exerciseId) return EXERCISE_ACTIVITY[named.exerciseId];

	// A GPS workout whose track sits at the top level, with no exercise naming
	// the activity. Running is the assumption because it is what GPS mode is
	// overwhelmingly used for, and because a wrong guess here is visible and
	// correctable rather than silent.
	if (session.mode === 'gps' && hasTrack(session.gpsTrack)) return 'running';

	return null;
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

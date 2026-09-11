/**
 * Which activities segments exist for.
 *
 * Best efforts put walking and hiking on the *running* board — they're all on
 * foot and ranked by pace, so `activityKindOf` folds every non-cycling activity
 * into `'running'`. Segments are listed on those same two boards, and that fold
 * is wrong for them: a segment is a race against the clock over one fixed
 * stretch of ground, so a walk up a hill and a run up the same hill are not the
 * same contest. Carved from a hike, a segment still landed on the running board,
 * with a leaderboard of times nobody was racing.
 *
 * So segments — creating them, matching sessions against them, and suggesting
 * them — are limited to running and cycling, one activity per board. Walking and
 * hiking keep everything else: best efforts, records, the route map, history.
 */
export const SEGMENT_ACTIVITIES = ['running', 'cycling'] as const;

export type SegmentActivity = (typeof SEGMENT_ACTIVITIES)[number];

/** Can this activity carry segments? Narrows to `SegmentActivity`. */
export function isSegmentActivity(
	activityType: string | null | undefined
): activityType is SegmentActivity {
	return activityType === 'running' || activityType === 'cycling';
}

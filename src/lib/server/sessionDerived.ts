// Everything a run's GPS track implies, refreshed in one place.
//
// Several endpoints can change a session's track — snap, recalculate, GPX
// upload, GPX removal — and each has to redo the same chain: settle the
// activity type, refresh the bbox, recompute the cached best efforts, re-match
// segments, redetect the records the run earned, and update the auto-detect
// grid. Missing a link is invisible (the run just quietly stops appearing on a
// board), so the chain lives here and every endpoint calls it once.
//
// Session *creation* is deliberately not a caller: it computes these fields
// before the document exists, to hand the achievements straight back in the
// response, so there is no saved doc to refresh. Any change to the chain has to
// be mirrored in `POST /api/fitness/sessions` by hand.

import type { HydratedDocument } from 'mongoose';
import type { IWorkoutSession } from '$models/WorkoutSession';
import { computeBestEfforts, gatherSessionTrack, type BestEffort } from '$lib/fitness/bestEfforts';
import { activityKind, inferActivityType } from '$lib/server/bestEffortsBackfill';
import { detectBestEffortPrs } from '$lib/server/bestEffortPrs';
import { matchSessionAgainstAllSegments, sessionBbox, type SegmentAchievement } from '$lib/server/segments';
import { addRunToGrid, removeRunFromGrid } from '$lib/server/segmentGrid';

export type SessionDoc = HydratedDocument<IWorkoutSession>;

export interface TrackDerived {
	/** The run's fastest continuous K-km splits (empty when it isn't on a board). */
	bestEfforts: BestEffort[];
	/** All-time "fastest Nk" records this run set. */
	bestEffortPrs: NonNullable<IWorkoutSession['bestEffortPrs']>;
	/** PB / KOM records on matched segments. */
	segmentPrs: NonNullable<IWorkoutSession['segmentPrs']>;
	/** Every segment effort this run produced, for the completion screen. */
	segmentAchievements: SegmentAchievement[];
}

/**
 * Recompute and persist every field derived from `ws`'s GPS track. The document
 * must be hydrated with its tracks loaded; it is saved twice (derived fields,
 * then the records) so a failure in the record detection still leaves the splits
 * stored. Each step past the first save is best-effort — a segment or weather
 * service hiccup must never fail the caller's write.
 *
 * `context` names the caller in log lines ("after snap", "during recalculate").
 */
export async function refreshTrackDerived(
	ws: SessionDoc,
	user: string,
	context: string
): Promise<TrackDerived> {
	// A run with no activityType (logged manually, or an old import) is off every
	// board — best efforts, backfill and the leaderboards all filter on it. Settle
	// it from the cardio exercise carrying the track before anything reads it.
	const inferred = inferActivityType(ws);
	if (inferred) ws.activityType = inferred;

	ws.gpsBbox = sessionBbox({ gpsTrack: ws.gpsTrack, exercises: ws.exercises }) ?? undefined;

	const beKind = activityKind(ws.activityType);
	const bestEfforts = beKind
		? computeBestEfforts(gatherSessionTrack({ gpsTrack: ws.gpsTrack, exercises: ws.exercises }))
		: [];
	ws.bestEfforts = bestEfforts.length ? bestEfforts : undefined;

	ws.markModified('exercises');
	await ws.save();

	// Re-match against segments (this drops the run's stale efforts first) and
	// keep the PB/KOM records it now earns.
	let segmentAchievements: SegmentAchievement[] = [];
	try {
		segmentAchievements = await matchSessionAgainstAllSegments(ws);
	} catch (err) {
		console.error(`Segment matching ${context} failed:`, err);
	}
	const segmentPrs = segmentAchievements
		.filter((a) => a.isPB || a.isKOM)
		.map((a) => ({
			segmentId: a.segmentId,
			segmentName: a.segmentName,
			distance: a.distance,
			elapsedSeconds: a.elapsedSeconds,
			isPB: a.isPB,
			isKOM: a.isKOM
		}));

	let bestEffortPrs: NonNullable<IWorkoutSession['bestEffortPrs']> = [];
	try {
		if (bestEfforts.length > 0 && beKind) {
			bestEffortPrs = await detectBestEffortPrs(user, ws._id, bestEfforts, beKind, ws.startTime);
		}
	} catch (err) {
		console.error(`Best-effort PR detection ${context} failed:`, err);
	}

	// Persist the records so they count toward the run's PR total on history and
	// cards, not just in this response.
	try {
		ws.bestEffortPrs = bestEffortPrs.length ? bestEffortPrs : undefined;
		ws.segmentPrs = segmentPrs.length ? segmentPrs : undefined;
		await ws.save();
	} catch (err) {
		console.error(`Persisting run PRs ${context} failed:`, err);
	}

	// The track's contribution to the auto-detect grid: cleared and re-added, so
	// a replaced or removed track doesn't leave its old cells behind.
	try {
		await removeRunFromGrid(user, String(ws._id));
		await addRunToGrid(user, String(ws._id), {
			activityType: ws.activityType,
			gpsTrack: ws.gpsTrack,
			exercises: ws.exercises
		});
	} catch (err) {
		console.error(`Segment grid update ${context} failed:`, err);
	}

	return { bestEfforts, bestEffortPrs, segmentPrs, segmentAchievements };
}

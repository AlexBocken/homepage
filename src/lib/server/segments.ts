/**
 * Server-only orchestration for segments: build geometry from a run slice,
 * match runs against segments (on save / snap), and backfill a freshly created
 * segment against history.
 *
 * The backfill is the ONLY place that reads other users' runs. It is gated
 * strictly on the `shareSegments` opt-in and on geometry — never on a
 * request-supplied user filter.
 */

import { Segment, type ISegment } from '$models/Segment';
import { SegmentEffort } from '$models/SegmentEffort';
import { WorkoutSession, type IWorkoutSession, type IGpsPoint } from '$models/WorkoutSession';
import { FitnessGoal } from '$models/FitnessGoal';
import { simplifyTrack } from '$lib/server/simplifyTrack';
import { trackDistance } from '$lib/fitness/gpsSeries.js';
import {
  detectEfforts,
  computeBbox,
  bboxIntersects,
  MIN_SEGMENT_DIST_M,
  type TrackPoint,
  type Bbox,
  type Effort,
  type SegmentGeometry
} from '$lib/server/segmentMatch';

type ActivityType = 'running' | 'walking' | 'cycling' | 'hiking';

export interface SegmentGeometryBuild {
  points: number[][];
  startPoint: { lat: number; lng: number };
  endPoint: { lat: number; lng: number };
  bbox: Bbox;
  distance: number;
  elevationGain: number;
  pointCount: number;
}

/** Positive altitude change (m) over a slice; null altitudes skipped. */
function gainOf(slice: TrackPoint[]): number {
  let gain = 0;
  let prev: number | null = null;
  for (const p of slice) {
    if (p.altitude == null) continue;
    if (prev != null && p.altitude > prev) gain += p.altitude - prev;
    prev = p.altitude;
  }
  return Math.round(gain);
}

/**
 * Build a segment's stored geometry from a contiguous slice of a run's track.
 * Returns null if the slice is too short to be a meaningful segment.
 */
export function buildSegmentGeometry(slice: IGpsPoint[]): SegmentGeometryBuild | null {
  if (!slice || slice.length < 2) return null;
  const distance = trackDistance(slice);
  if (distance * 1000 < MIN_SEGMENT_DIST_M) return null;
  const bbox = computeBbox(slice);
  if (!bbox) return null;
  const points = simplifyTrack(slice, 64);
  return {
    points,
    startPoint: { lat: slice[0].lat, lng: slice[0].lng },
    endPoint: { lat: slice[slice.length - 1].lat, lng: slice[slice.length - 1].lng },
    bbox,
    distance,
    elevationGain: gainOf(slice as TrackPoint[]),
    pointCount: points.length
  };
}

/** Bounding box over every GPS point of a run (top-level + per-exercise). */
export function sessionBbox(session: Pick<IWorkoutSession, 'gpsTrack' | 'exercises'>): Bbox | null {
  const all: Array<{ lat: number; lng: number }> = [];
  if (session.gpsTrack?.length) all.push(...session.gpsTrack);
  for (const ex of session.exercises ?? []) if (ex.gpsTrack?.length) all.push(...ex.gpsTrack);
  return all.length ? computeBbox(all) : null;
}

interface TrackSource {
  exerciseIndex: number | null;
  track: IGpsPoint[];
}

/** Every GPS track carried by a run, tagged with where it lives. */
function trackSources(session: Pick<IWorkoutSession, 'gpsTrack' | 'exercises'>): TrackSource[] {
  const sources: TrackSource[] = [];
  if ((session.gpsTrack?.length ?? 0) >= 2) {
    sources.push({ exerciseIndex: null, track: session.gpsTrack as IGpsPoint[] });
  }
  (session.exercises ?? []).forEach((ex, idx) => {
    if ((ex.gpsTrack?.length ?? 0) >= 2) sources.push({ exerciseIndex: idx, track: ex.gpsTrack as IGpsPoint[] });
  });
  return sources;
}

function toGeometry(seg: ISegment): SegmentGeometry {
  return { points: seg.points, startPoint: seg.startPoint, endPoint: seg.endPoint, distance: seg.distance };
}

/**
 * Nicknames of users who opted OUT of cross-user leaderboards. Sharing is the
 * default (opt-out), so a user appears on leaderboards unless they are in this
 * set; users with no goal doc / unset flag are treated as sharing.
 */
export async function optedOutUsernames(): Promise<Set<string>> {
  const goals = await FitnessGoal.find({ shareSegments: false }).select('username').lean();
  return new Set(goals.map((g) => g.username));
}

export interface SegmentAchievement {
  segmentId: string;
  segmentName: string;
  distance: number;
  elapsedSeconds: number;
  isPB: boolean; // beat the user's own previous best
  isKOM: boolean; // now the fastest among opted-in users (a new crown)
  rank: number | null; // global rank among opted-in best-per-user, if applicable
  totalAthletes: number | null;
}

/**
 * Match a saved run against every geometrically-plausible segment, (re)writing
 * its efforts. Returns the achievements unlocked by this run for the completion
 * screen. Efforts against OTHER users' segments are only recorded when the run
 * owner has opted in; efforts against the user's own segments always are.
 */
export async function matchSessionAgainstAllSegments(
  session: IWorkoutSession & { _id: unknown }
): Promise<SegmentAchievement[]> {
  const sources = trackSources(session);
  if (!sources.length) return [];
  const activityType = session.activityType as ActivityType | undefined;

  const runBbox = sessionBbox(session);
  if (!runBbox) return [];

  // Candidate segments: lat-range overlap, restricted to the run's activity when
  // it has one (a run with no activityType — e.g. an older import — can still
  // match any segment; geometry is the real gate).
  const candidates = await Segment.find({
    ...(activityType ? { activityType } : {}),
    'bbox.minLat': { $lte: runBbox.maxLat },
    'bbox.maxLat': { $gte: runBbox.minLat }
  }).lean();

  const owner = session.createdBy;
  const goal = await FitnessGoal.findOne({ username: owner }).select('shareSegments').lean();
  const ownerSharing = goal?.shareSegments !== false; // opt-out: shares unless explicitly false

  const sessionId = String(session._id);
  // Re-match cleanly: drop any prior efforts for this run.
  await SegmentEffort.deleteMany({ sessionId });

  const created: Array<{ segment: ISegment; effort: Effort }> = [];

  for (const seg of candidates) {
    if (!bboxIntersects(runBbox, seg.bbox, 0)) continue; // lng check
    // Privacy: only record on someone else's segment if the owner is sharing.
    if (seg.createdBy !== owner && !ownerSharing) continue;

    const geom = toGeometry(seg);
    for (const src of sources) {
      const efforts = detectEfforts(src.track as TrackPoint[], geom);
      for (const e of efforts) {
        await SegmentEffort.create({
          segmentId: seg._id,
          sessionId,
          userId: owner,
          activityType: seg.activityType, // the segment defines the activity (required by schema)
          elapsedSeconds: Math.round(e.elapsedSeconds),
          distance: e.distance,
          avgPace: e.avgPace,
          elevationGain: e.elevationGain,
          startIdx: e.startIdx,
          endIdx: e.endIdx,
          exerciseIndex: src.exerciseIndex,
          date: session.startTime
        });
        created.push({ segment: seg, effort: e });
      }
    }
  }

  return computeAchievements(created, owner, sessionId, ownerSharing);
}

/** Best (fastest) effort per segment in this run, evaluated for PB / KOM. */
async function computeAchievements(
  created: Array<{ segment: ISegment; effort: Effort }>,
  owner: string,
  sessionId: string,
  ownerSharing: boolean
): Promise<SegmentAchievement[]> {
  // Keep the fastest effort per segment for this run.
  const bestPerSegment = new Map<string, { segment: ISegment; elapsed: number }>();
  for (const { segment, effort } of created) {
    const id = String(segment._id);
    const elapsed = Math.round(effort.elapsedSeconds);
    const cur = bestPerSegment.get(id);
    if (!cur || elapsed < cur.elapsed) bestPerSegment.set(id, { segment, elapsed });
  }

  const optedOut = ownerSharing ? await optedOutUsernames() : new Set<string>();
  const achievements: SegmentAchievement[] = [];

  for (const [segmentId, { segment, elapsed }] of bestPerSegment) {
    // PB: did the user have a faster effort on this segment in a DIFFERENT run?
    const prevBest = await SegmentEffort.find({ segmentId, userId: owner, sessionId: { $ne: sessionId } })
      .sort({ elapsedSeconds: 1 })
      .limit(1)
      .lean();
    const isPB = prevBest.length > 0 && elapsed < prevBest[0].elapsedSeconds;

    let isKOM = false;
    let rank: number | null = null;
    let totalAthletes: number | null = null;
    if (ownerSharing && segment.public) {
      // Best-per-user across sharing athletes → leaderboard.
      const rows = await SegmentEffort.aggregate([
        { $match: { segmentId: segment._id } },
        { $group: { _id: '$userId', best: { $min: '$elapsedSeconds' } } },
        { $sort: { best: 1 } }
      ]);
      const board = rows.filter((r) => !optedOut.has(r._id));
      totalAthletes = board.length;
      const myPos = board.findIndex((r) => r._id === owner);
      rank = myPos >= 0 ? myPos + 1 : null;
      isKOM = rank === 1 && elapsed <= (board[0]?.best ?? Infinity);
    }

    achievements.push({
      segmentId,
      segmentName: segment.name,
      distance: segment.distance,
      elapsedSeconds: elapsed,
      isPB,
      isKOM,
      rank,
      totalAthletes
    });
  }

  return achievements;
}

/**
 * Backfill a newly created segment against historical runs. CROSS-USER: scans
 * everyone's GPS runs (sharing is opt-out) except users who opted out — the
 * creator's own runs always count even if they opted out. Bounded by activity +
 * bbox prefilter; never filtered by a request-supplied user.
 */
export async function backfillSegment(segment: ISegment & { _id: unknown }): Promise<number> {
  const optedOut = await optedOutUsernames();

  // Pre-existing runs predate the gpsBbox / activityType fields, so both
  // prefilters must let through documents where the field is absent — otherwise
  // history never matches a freshly created segment. The bbox is checked exactly
  // (and back-filled) in the loop; runs missing it fall back to a full geometry
  // check rather than being silently dropped. No createdBy filter (opt-out model);
  // opted-out non-owners are skipped in the loop.
  const runs = await WorkoutSession.find({
    $and: [
      { $or: [{ activityType: segment.activityType }, { activityType: { $in: [null] } }, { activityType: { $exists: false } }] },
      {
        $or: [
          { gpsBbox: { $exists: false } },
          { 'gpsBbox.minLat': { $lte: segment.bbox.maxLat }, 'gpsBbox.maxLat': { $gte: segment.bbox.minLat } }
        ]
      }
    ]
  })
    .select('createdBy startTime gpsTrack exercises.gpsTrack gpsBbox activityType')
    .lean();

  const geom = toGeometry(segment);
  const segmentId = segment._id;
  // Idempotent: clear any prior efforts for this segment before rebuilding.
  await SegmentEffort.deleteMany({ segmentId });
  let count = 0;

  for (const run of runs) {
    // Opted-out non-owners don't appear; the creator always counts on their own segment.
    if (run.createdBy !== segment.createdBy && optedOut.has(run.createdBy)) continue;

    // Self-heal: compute + persist a bbox for legacy runs so future matches
    // prefilter properly. Skip the run only when a known bbox can't overlap.
    let bbox = run.gpsBbox;
    if (!bbox) {
      bbox = sessionBbox(run) ?? undefined;
      if (bbox) WorkoutSession.updateOne({ _id: run._id }, { $set: { gpsBbox: bbox } }).catch(() => {});
    }
    if (bbox && !bboxIntersects(bbox, segment.bbox, 0)) continue;

    for (const src of trackSources(run)) {
      const efforts = detectEfforts(src.track as TrackPoint[], geom);
      for (const e of efforts) {
        await SegmentEffort.create({
          segmentId,
          sessionId: run._id,
          userId: run.createdBy,
          activityType: segment.activityType,
          elapsedSeconds: Math.round(e.elapsedSeconds),
          distance: e.distance,
          avgPace: e.avgPace,
          elevationGain: e.elevationGain,
          startIdx: e.startIdx,
          endIdx: e.endIdx,
          exerciseIndex: src.exerciseIndex,
          date: run.startTime
        });
        count++;
      }
    }
  }
  return count;
}

/**
 * Turn a user's popular grid cells into suggested segments: walk each GPS run,
 * find contiguous runs of popular cells (bridging small gaps), dedup
 * near-duplicates against each other and against segments that already exist,
 * then surface only the few best-scoring corridors (frequently run, in the
 * 500 m–3 km sweet spot). Suggestions map back to real run-track indices so
 * accepting one reuses the normal create-from-slice flow.
 *
 * Server-only. Reuses the matcher (detectEfforts / bbox) and grid sampling.
 */

import crypto from 'node:crypto';
import { trackDistance } from '$lib/fitness/gpsSeries.js';
import { simplifyTrack } from '$lib/server/simplifyTrack';
import {
  detectEfforts,
  computeBbox,
  bboxIntersects,
  type SegmentGeometry,
  type TrackPoint,
  type Bbox
} from '$lib/server/segmentMatch';
import { sampledCells, loadPopularCells } from '$lib/server/segmentGrid';
import { Segment } from '$models/Segment';
import { DismissedSuggestion } from '$models/DismissedSuggestion';
import { WorkoutSession, type IGpsPoint } from '$models/WorkoutSession';

const MIN_SUGGEST_DIST_M = 400; // suggestions should be meaningful, > the manual floor
const MERGE_GAP_M = 60; // bridge short non-popular gaps within a span
const MAX_SUGGESTIONS = 3; // only surface the few best corridors
const IDEAL_MIN_KM = 0.5; // sweet spot: not too short...
const IDEAL_MAX_KM = 3.0; // ...and not too long
const HASH_GRID_DEG = 0.0003; // ~33 m: same corridor → same hash across rebuilds

export interface SegmentSuggestion {
  routeHash: string; // stable id of the corridor, for persistent dismissal
  sessionId: string;
  exerciseIndex: number | null;
  startIdx: number;
  endIdx: number;
  points: number[][]; // simplified polyline for preview
  distance: number; // km
  seenCount: number; // distinct runs over the least-travelled cell in the span
}

/** Coarse, geometry-based id so the same corridor hashes the same next rebuild. */
function routeHash(points: number[][], distance: number): string {
  const r = (v: number) => Math.round(v / HASH_GRID_DEG);
  const start = points[0];
  const end = points[points.length - 1];
  const mid = points[Math.floor(points.length / 2)];
  const key = [start, mid, end]
    .map((p) => `${r(p[0])}:${r(p[1])}`)
    .concat(String(Math.round(distance * 10)))
    .join('|');
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

interface Candidate extends Omit<SegmentSuggestion, 'routeHash'> {
  slice: IGpsPoint[]; // raw slice (with timestamps) for dedup matching
  geom: SegmentGeometry;
  bbox: Bbox;
}

function buildCandidate(
  track: IGpsPoint[],
  rawStart: number,
  rawEnd: number,
  seenCount: number,
  sessionId: string,
  exerciseIndex: number | null
): Candidate | null {
  const slice = track.slice(rawStart, rawEnd + 1);
  if (slice.length < 2) return null;
  const distance = trackDistance(slice);
  if (distance * 1000 < MIN_SUGGEST_DIST_M) return null;
  const bbox = computeBbox(slice);
  if (!bbox) return null;
  const points = simplifyTrack(slice, 64);
  const startPoint = { lat: slice[0].lat, lng: slice[0].lng };
  const endPoint = { lat: slice[slice.length - 1].lat, lng: slice[slice.length - 1].lng };
  return {
    sessionId,
    exerciseIndex,
    startIdx: rawStart,
    endIdx: rawEnd,
    points,
    distance,
    seenCount,
    slice,
    geom: { points, startPoint, endPoint, distance },
    bbox
  };
}

/** Extract candidate spans of popular cells from one track. */
function spansForTrack(
  track: IGpsPoint[],
  popular: Map<string, number>,
  sessionId: string,
  exerciseIndex: number | null
): Candidate[] {
  const sc = sampledCells(track);
  const out: Candidate[] = [];
  let spanStart = -1;
  let lastPopular = -1;
  let minCount = Infinity;
  let gapKm = 0;

  const close = () => {
    if (spanStart >= 0 && lastPopular > spanStart) {
      const c = buildCandidate(track, sc[spanStart].idx, sc[lastPopular].idx, minCount, sessionId, exerciseIndex);
      if (c) out.push(c);
    }
    spanStart = -1;
    lastPopular = -1;
    minCount = Infinity;
    gapKm = 0;
  };

  for (let i = 0; i < sc.length; i++) {
    const cnt = popular.get(sc[i].cellKey);
    if (cnt != null) {
      if (spanStart < 0) spanStart = i;
      minCount = Math.min(minCount, cnt);
      lastPopular = i;
      gapKm = 0;
    } else if (spanStart >= 0) {
      if (i > 0) gapKm += trackDistance([sc[i - 1], sc[i]]);
      if (gapKm * 1000 > MERGE_GAP_M) close();
    }
  }
  close();
  return out;
}

/**
 * Rank candidates by how often the corridor was run (repeats) weighted by how
 * well its length sits in the 500 m–3 km sweet spot. Corridors outside the band
 * decay linearly, so a well-sized, frequently-run corridor wins.
 */
function candidateScore(c: { distance: number; seenCount: number }): number {
  const d = c.distance;
  let lengthFactor: number;
  if (d < IDEAL_MIN_KM) lengthFactor = d / IDEAL_MIN_KM; // ramps up to 1 at 500 m
  else if (d > IDEAL_MAX_KM) lengthFactor = IDEAL_MAX_KM / d; // falls off past 3 km
  else lengthFactor = 1;
  return c.seenCount * lengthFactor;
}

/** Does `cand` cover the same ground as an existing geometry? */
function overlaps(cand: Candidate, geom: SegmentGeometry, bbox: Bbox): boolean {
  if (!bboxIntersects(cand.bbox, bbox, 0)) return false;
  return detectEfforts(cand.slice as TrackPoint[], geom).length > 0;
}

interface TrackSource {
  track: IGpsPoint[];
  sessionId: string;
  exerciseIndex: number | null;
}

/** Stitch + dedup candidates from a set of track sources into suggestions. */
async function buildSuggestions(userId: string, sources: TrackSource[]): Promise<SegmentSuggestion[]> {
  const popular = await loadPopularCells(userId);
  if (popular.size === 0) return [];

  const candidates: Candidate[] = [];
  for (const s of sources) {
    if ((s.track?.length ?? 0) >= 2) candidates.push(...spansForTrack(s.track, popular, s.sessionId, s.exerciseIndex));
  }
  if (candidates.length === 0) return [];

  // Existing segments to dedup against (only geometry needed).
  const existing = await Segment.find({}).select('points startPoint endPoint distance bbox').lean();
  const existingGeoms = existing.map((s) => ({
    geom: { points: s.points, startPoint: s.startPoint, endPoint: s.endPoint, distance: s.distance } as SegmentGeometry,
    bbox: s.bbox as Bbox
  }));

  // Corridors the user has permanently dismissed.
  const dismissed = new Set(
    (await DismissedSuggestion.find({ userId }).select('routeHash').lean()).map((d) => d.routeHash)
  );

  // Best-scoring first (repeats × length fit); greedily keep non-overlapping,
  // non-dismissed candidates until we have the top MAX_SUGGESTIONS.
  candidates.sort((a, b) => candidateScore(b) - candidateScore(a));
  const kept: Array<Candidate & { routeHash: string }> = [];
  for (const c of candidates) {
    const hash = routeHash(c.points, c.distance);
    if (dismissed.has(hash)) continue;
    if (existingGeoms.some((e) => overlaps(c, e.geom, e.bbox))) continue;
    if (kept.some((k) => overlaps(c, k.geom, k.bbox))) continue;
    kept.push({ ...c, routeHash: hash });
    if (kept.length >= MAX_SUGGESTIONS) break;
  }

  return kept.map((c) => ({
    routeHash: c.routeHash,
    sessionId: c.sessionId,
    exerciseIndex: c.exerciseIndex,
    startIdx: c.startIdx,
    endIdx: c.endIdx,
    points: c.points,
    distance: c.distance,
    seenCount: c.seenCount
  }));
}

function runSources(run: { _id: unknown; gpsTrack?: IGpsPoint[]; exercises?: Array<{ gpsTrack?: IGpsPoint[] }> }): TrackSource[] {
  const id = String(run._id);
  const sources: TrackSource[] = [];
  if ((run.gpsTrack?.length ?? 0) >= 2) sources.push({ track: run.gpsTrack as IGpsPoint[], sessionId: id, exerciseIndex: null });
  (run.exercises ?? []).forEach((ex, idx) => {
    if ((ex.gpsTrack?.length ?? 0) >= 2) sources.push({ track: ex.gpsTrack as IGpsPoint[], sessionId: id, exerciseIndex: idx });
  });
  return sources;
}

/** Suggested segments across all of a user's runs, top-scoring first, deduped. */
export async function suggestSegments(userId: string): Promise<SegmentSuggestion[]> {
  const runs = await WorkoutSession.find({
    createdBy: userId,
    $or: [{ gpsTrack: { $exists: true, $ne: [] } }, { 'exercises.gpsTrack': { $exists: true, $ne: [] } }]
  })
    .select('gpsTrack exercises.gpsTrack')
    .lean();
  return buildSuggestions(userId, runs.flatMap(runSources));
}

/** Suggested segments found within a single run (indices map to that run's tracks). */
export async function suggestSegmentsForRun(userId: string, sessionId: string): Promise<SegmentSuggestion[]> {
  const run = await WorkoutSession.findOne({ _id: sessionId, createdBy: userId })
    .select('gpsTrack exercises.gpsTrack')
    .lean();
  if (!run) return [];
  return buildSuggestions(userId, runSources(run));
}

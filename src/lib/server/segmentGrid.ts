/**
 * Per-user spatial-frequency grid used to auto-detect repeated route sections.
 * A run's track is resampled to an even step and each sample mapped to a
 * ~GRID_M cell keyed by rounded lat/lng + bearing octant (so the two directions
 * of a road, or an out-and-back, stay distinct). We track which of the user's
 * runs touched each cell; cells touched by many runs are "popular" and later
 * get stitched into suggested segments.
 *
 * Server-only. Reuses `haversine` from the shared GPS maths.
 */

import { haversine } from '$lib/fitness/gpsSeries.js';
import { SegmentGridCell } from '$models/SegmentGridCell';
import { WorkoutSession } from '$models/WorkoutSession';

export const GRID_M = 30; // cell size
export const STEP_M = 15; // resample spacing
export const POPULAR_MIN_RUNS = 3; // a cell is "popular" at ≥ this many distinct runs

const DEG_PER_M_LAT = 1 / 111_320;

interface LatLng {
  lat: number;
  lng: number;
}

function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const dλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Resample to ~stepKm spacing, keeping each sample's index in the raw track. */
function resampleStepIdx(track: LatLng[], stepKm: number): Array<{ idx: number; p: LatLng }> {
  if (track.length < 2) return track.map((p, idx) => ({ idx, p }));
  const out = [{ idx: 0, p: track[0] }];
  let acc = 0;
  for (let i = 1; i < track.length; i++) {
    acc += haversine(track[i - 1], track[i]);
    if (acc >= stepKm) {
      out.push({ idx: i, p: track[i] });
      acc = 0;
    }
  }
  const lastIdx = track.length - 1;
  if (out[out.length - 1].idx !== lastIdx) out.push({ idx: lastIdx, p: track[lastIdx] });
  return out;
}

export interface SampledCell {
  idx: number; // index into the raw track
  lat: number;
  lng: number;
  cellKey: string;
}

/**
 * The grid cells a track passes through, one per resampled sample, tagged with
 * the originating raw-track index (so stitching can map spans back to real
 * indices for segment creation).
 */
export function sampledCells(track: LatLng[]): SampledCell[] {
  if (!track || track.length < 2) return [];
  const res = resampleStepIdx(track, STEP_M / 1000);
  const out: SampledCell[] = [];
  for (let i = 1; i < res.length; i++) {
    const { idx, p } = res[i];
    const latGrid = Math.round(p.lat / (GRID_M * DEG_PER_M_LAT));
    const lngStepDeg = GRID_M / (111_320 * Math.cos((p.lat * Math.PI) / 180));
    const lngGrid = Math.round(p.lng / lngStepDeg);
    const oct = Math.floor(((bearingDeg(res[i - 1].p, p) + 22.5) % 360) / 45);
    out.push({ idx, lat: p.lat, lng: p.lng, cellKey: `${latGrid}:${lngGrid}:${oct}` });
  }
  return out;
}

/** Cell keys (→ representative coords) a single track passes through. */
export function cellsForTrack(track: LatLng[]): Map<string, LatLng> {
  const out = new Map<string, LatLng>();
  for (const c of sampledCells(track)) if (!out.has(c.cellKey)) out.set(c.cellKey, { lat: c.lat, lng: c.lng });
  return out;
}

/** Map of popular cellKey → run count for a user (cells hit by ≥ POPULAR_MIN_RUNS runs). */
export async function loadPopularCells(userId: string): Promise<Map<string, number>> {
  const cells = await SegmentGridCell.find({ userId, count: { $gte: POPULAR_MIN_RUNS } })
    .select('cellKey count')
    .lean();
  return new Map(cells.map((c) => [c.cellKey, c.count]));
}

type SessionLike = {
  gpsTrack?: LatLng[];
  exercises?: Array<{ gpsTrack?: LatLng[] }>;
};

/** Union of cells across all GPS tracks a run carries (top-level + per-exercise). */
export function cellsForSession(session: SessionLike): Map<string, LatLng> {
  const all = new Map<string, LatLng>();
  const merge = (track?: LatLng[]) => {
    if ((track?.length ?? 0) < 2) return;
    for (const [k, c] of cellsForTrack(track as LatLng[])) if (!all.has(k)) all.set(k, c);
  };
  merge(session.gpsTrack);
  for (const ex of session.exercises ?? []) merge(ex.gpsTrack);
  return all;
}

/** Add a run's cells to the user's grid (idempotent via $addToSet). */
export async function addRunToGrid(userId: string, sessionId: string, session: SessionLike): Promise<void> {
  const cells = cellsForSession(session);
  if (cells.size === 0) return;
  const ops = [...cells].map(([cellKey, c]) => ({
    updateOne: {
      filter: { userId, cellKey },
      update: { $addToSet: { runIds: sessionId }, $setOnInsert: { lat: c.lat, lng: c.lng } },
      upsert: true
    }
  }));
  await SegmentGridCell.bulkWrite(ops, { ordered: false });
  // Refresh denormalized counts for the touched cells. Array update = aggregation
  // pipeline; Mongoose 9 requires `updatePipeline` to accept it.
  await SegmentGridCell.updateMany(
    { userId, cellKey: { $in: [...cells.keys()] } },
    [{ $set: { count: { $size: '$runIds' } } }],
    { updatePipeline: true }
  );
}

/** Remove a run from the user's grid (on delete, or before re-adding on snap). */
export async function removeRunFromGrid(userId: string, sessionId: string): Promise<void> {
  await SegmentGridCell.updateMany({ userId, runIds: sessionId }, { $pull: { runIds: sessionId } });
  // Array update = aggregation pipeline; Mongoose 9 requires `updatePipeline`.
  await SegmentGridCell.updateMany(
    { userId },
    [{ $set: { count: { $size: '$runIds' } } }],
    { updatePipeline: true }
  );
  await SegmentGridCell.deleteMany({ userId, count: { $lte: 0 } });
}

export interface GridRebuildResult {
  runs: number;
  cells: number;
  popular: number;
}

/** Wipe + rebuild a user's whole grid from their GPS-run history (bulk button). */
export async function rebuildGridForUser(userId: string): Promise<GridRebuildResult> {
  await SegmentGridCell.deleteMany({ userId });

  const runs = await WorkoutSession.find({
    createdBy: userId,
    $or: [{ gpsTrack: { $exists: true, $ne: [] } }, { 'exercises.gpsTrack': { $exists: true, $ne: [] } }]
  })
    .select('gpsTrack exercises.gpsTrack')
    .lean();

  const acc = new Map<string, { lat: number; lng: number; runs: Set<string> }>();
  for (const run of runs) {
    const id = String(run._id);
    for (const [key, c] of cellsForSession(run)) {
      let cell = acc.get(key);
      if (!cell) {
        cell = { lat: c.lat, lng: c.lng, runs: new Set() };
        acc.set(key, cell);
      }
      cell.runs.add(id);
    }
  }

  if (acc.size > 0) {
    const docs = [...acc].map(([cellKey, v]) => ({
      userId,
      cellKey,
      lat: v.lat,
      lng: v.lng,
      runIds: [...v.runs],
      count: v.runs.size
    }));
    await SegmentGridCell.insertMany(docs, { ordered: false });
  }

  let popular = 0;
  for (const v of acc.values()) if (v.runs.size >= POPULAR_MIN_RUNS) popular++;
  return { runs: runs.length, cells: acc.size, popular };
}

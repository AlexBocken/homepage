/**
 * Pure, dependency-light segment matching. Given a run's GPS track and a
 * segment's geometry, find every traversal ("effort") of that segment in the
 * run: it must pass near the start, then near the end (after travelling most of
 * the segment), and roughly follow the segment's shape. Tolerant of GPS noise.
 *
 * No SvelteKit / DB imports — fully unit-testable. Only borrows `haversine` and
 * `trackDistance` (km) from the shared GPS maths.
 */

import { haversine, trackDistance } from '$lib/fitness/gpsSeries.js';

// Tunable thresholds (metres unless noted). Validate against real tracks.
export const START_END_RADIUS_M = 25; // proximity to the segment start / end
export const SIMILARITY_TOL_M = 30; // a segment sample is "covered" within this
export const SIMILARITY_MIN_FRAC = 0.8; // ≥ this fraction of samples must be covered
export const MIN_SEGMENT_DIST_M = 100; // refuse degenerate segments
export const SIMILARITY_SAMPLE_N = 30; // segment resampled to this many even points
export const MIN_TRAVEL_FRAC = 0.7; // travel ≥ this × segment length before an end counts
export const END_SCAN_CAP_FACTOR = 3; // stop scanning for an end after this × segment length

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrackPoint extends LatLng {
  altitude?: number | null;
  timestamp: number;
}

export interface SegmentGeometry {
  points: number[][] | LatLng[]; // polyline, [[lat,lng],...] or {lat,lng}[]
  startPoint: LatLng;
  endPoint: LatLng;
  distance: number; // km
}

export interface Effort {
  startIdx: number;
  endIdx: number;
  elapsedSeconds: number;
  distance: number; // km traversed
  avgPace: number | null; // min/km
  elevationGain: number | null; // m
}

function toLL(p: number[] | LatLng): LatLng {
  return Array.isArray(p) ? { lat: p[0], lng: p[1] } : p;
}

/** Resample a polyline to `n` points evenly spaced by arc length (ends included). */
export function resampleByDistance(pts: LatLng[], n: number): LatLng[] {
  if (pts.length <= 1) return pts.slice();
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + haversine(pts[i - 1], pts[i]);
  const total = cum[cum.length - 1];
  if (total === 0) return [pts[0]];
  const out: LatLng[] = [];
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    let j = 0;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const seg = cum[j + 1] - cum[j];
    const frac = seg > 0 ? (target - cum[j]) / seg : 0;
    out.push({
      lat: pts[j].lat + frac * (pts[j + 1].lat - pts[j].lat),
      lng: pts[j].lng + frac * (pts[j + 1].lng - pts[j].lng)
    });
  }
  return out;
}

/**
 * Project `point` onto the segment a→b using a local equirectangular frame
 * centred on `point` (accurate at these scales). Returns the interpolation
 * parameter t∈[0,1] of the closest point and its distance in metres.
 */
function closestOnSegment(point: LatLng, a: LatLng, b: LatLng): { t: number; dist: number } {
  const R = 6371000;
  const lat0 = (point.lat * Math.PI) / 180;
  const toXY = (q: LatLng) => ({
    x: ((q.lng - point.lng) * Math.PI * R * Math.cos(lat0)) / 180,
    y: ((q.lat - point.lat) * Math.PI * R) / 180
  });
  const A = toXY(a);
  const B = toXY(b);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? (-A.x * dx + -A.y * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = A.x + t * dx;
  const cy = A.y + t * dy;
  return { t, dist: Math.hypot(cx, cy) };
}

/** Min distance (m) from a point to a polyline (its segments). */
function minDistToTrackM(point: LatLng, sub: LatLng[]): number {
  if (sub.length === 1) return haversine(point, sub[0]) * 1000;
  let best = Infinity;
  for (let i = 0; i < sub.length - 1; i++) {
    const d = closestOnSegment(point, sub[i], sub[i + 1]).dist;
    if (d < best) best = d;
  }
  return best;
}

/**
 * Interpolate the timestamp at the moment the run passes closest to `point`,
 * looking at the two track edges around `idx`. Fair across runs sampled at
 * different rates (mirrors the snap endpoint's arc-length timestamp mapping).
 */
function refineCrossing(track: TrackPoint[], idx: number, point: LatLng): { dist: number; timeMs: number } {
  let best = { dist: Infinity, timeMs: track[idx].timestamp };
  const consider = (i: number) => {
    if (i < 0 || i + 1 >= track.length) return;
    const { t, dist } = closestOnSegment(point, track[i], track[i + 1]);
    if (dist < best.dist) {
      const a = track[i];
      const b = track[i + 1];
      best = { dist, timeMs: a.timestamp + t * (b.timestamp - a.timestamp) };
    }
  };
  consider(idx - 1);
  consider(idx);
  return best;
}

/** Cumulative positive altitude change (m) over a sub-track; null altitudes skipped. */
function computeGain(sub: TrackPoint[]): number {
  let gain = 0;
  let prev: number | null = null;
  for (const p of sub) {
    if (p.altitude == null) continue;
    if (prev != null && p.altitude > prev) gain += p.altitude - prev;
    prev = p.altitude;
  }
  return Math.round(gain);
}

/**
 * Find all efforts for `segment` within `track`. Direction is enforced
 * implicitly (start must be reached before the end). Multiple laps each yield
 * an effort; the scan resumes past each completed effort so they never overlap.
 */
export function detectEfforts(track: TrackPoint[], segment: SegmentGeometry): Effort[] {
  const efforts: Effort[] = [];
  if (!track || track.length < 2) return efforts;

  const segPts = (segment.points as Array<number[] | LatLng>).map(toLL);
  const resampled = resampleByDistance(segPts, SIMILARITY_SAMPLE_N);
  const startRadKm = START_END_RADIUS_M / 1000;
  const segDistKm = segment.distance;
  const minTravelKm = segDistKm * MIN_TRAVEL_FRAC;
  const endScanCapKm = Math.max(END_SCAN_CAP_FACTOR * segDistKm, segDistKm + 0.2);

  let i = 0;
  while (i < track.length) {
    // 1. Start crossing — first point within radius of the segment start.
    if (haversine(track[i], segment.startPoint) > startRadKm) {
      i++;
      continue;
    }
    const startCross = refineCrossing(track, i, segment.startPoint);

    // 2. End crossing — after travelling ≥ minTravelKm, the closest approach to
    //    the segment end within radius. Lock it once we enter then leave the radius.
    let cum = 0;
    let bestEndDist = Infinity;
    let bestEndIdx = -1;
    for (let j = i; j < track.length - 1 && cum <= endScanCapKm; j++) {
      cum += haversine(track[j], track[j + 1]);
      if (cum < minTravelKm) continue;
      const dEnd = haversine(track[j + 1], segment.endPoint);
      if (dEnd <= startRadKm) {
        if (dEnd < bestEndDist) {
          bestEndDist = dEnd;
          bestEndIdx = j + 1;
        }
      } else if (bestEndIdx >= 0) {
        break; // entered then left the end radius → closest approach is the crossing
      }
    }
    const endIdx = bestEndIdx;
    if (endIdx <= i) {
      i++;
      continue;
    }

    // 3. Path similarity — most segment samples must lie near the sub-track.
    const sub = track.slice(i, endIdx + 1);
    let covered = 0;
    for (const s of resampled) if (minDistToTrackM(s, sub) <= SIMILARITY_TOL_M) covered++;
    if (covered / resampled.length < SIMILARITY_MIN_FRAC) {
      i++;
      continue;
    }

    // 4. Elapsed time from the interpolated crossings.
    const endCross = refineCrossing(track, endIdx, segment.endPoint);
    const elapsedMs = endCross.timeMs - startCross.timeMs;
    if (elapsedMs <= 0) {
      i++;
      continue;
    }

    const dist = trackDistance(sub);
    const elapsedSeconds = elapsedMs / 1000;
    efforts.push({
      startIdx: i,
      endIdx,
      elapsedSeconds,
      distance: dist,
      avgPace: dist > 0 ? elapsedSeconds / 60 / dist : null,
      elevationGain: computeGain(sub)
    });

    // 5. Resume past this effort (handles laps; keeps efforts non-overlapping).
    i = endIdx + 1;
  }

  return efforts;
}

export interface Bbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Bounding box over a list of points ([lat,lng] or {lat,lng}). */
export function computeBbox(points: Array<number[] | LatLng>): Bbox | null {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const raw of points) {
    const p = toLL(raw);
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  if (!Number.isFinite(minLat)) return null;
  return { minLat, maxLat, minLng, maxLng };
}

/** Do two bboxes overlap, optionally padded by `padDeg` degrees? */
export function bboxIntersects(a: Bbox, b: Bbox, padDeg = 0): boolean {
  return (
    a.minLat - padDeg <= b.maxLat &&
    a.maxLat + padDeg >= b.minLat &&
    a.minLng - padDeg <= b.maxLng &&
    a.maxLng + padDeg >= b.minLng
  );
}

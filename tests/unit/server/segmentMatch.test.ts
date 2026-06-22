import { describe, it, expect } from 'vitest';
import {
  detectEfforts,
  computeBbox,
  bboxIntersects,
  type TrackPoint,
  type SegmentGeometry
} from '$lib/server/segmentMatch';

const DT = 1000; // 1s between fixes

/** Straight track of `n` points from a→b, evenly timed. */
function line(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  n: number,
  t0 = 0,
  jitter = 0
): TrackPoint[] {
  const pts: TrackPoint[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    // deterministic sub-metre wobble (no Math.random → stable tests)
    const j = jitter * Math.sin(i * 1.7);
    pts.push({
      lat: a.lat + f * (b.lat - a.lat) + j * 0.000005,
      lng: a.lng + f * (b.lng - a.lng) + j * 0.000005,
      timestamp: t0 + i * DT
    });
  }
  return pts;
}

function reindexTime(track: TrackPoint[], t0: number): TrackPoint[] {
  return track.map((p, i) => ({ ...p, timestamp: t0 + i * DT }));
}

// A west→east run at ~lat 47; 100 points, ~15 m apart (~1.5 km total).
const A = { lat: 47.0, lng: 8.0 };
const B = { lat: 47.0, lng: 8.0198 };
const run = line(A, B, 100);

// Segment = the middle third of that run (points 30..70).
const segment: SegmentGeometry = {
  points: run.slice(30, 71).map((p) => [p.lat, p.lng]),
  startPoint: { lat: run[30].lat, lng: run[30].lng },
  endPoint: { lat: run[70].lat, lng: run[70].lng },
  distance: 0 // filled below
};
// real distance of the slice
import { trackDistance } from '$lib/fitness/gpsSeries.js';
segment.distance = trackDistance(run.slice(30, 71));

describe('detectEfforts', () => {
  it('finds one effort for a straight pass over the segment', () => {
    const efforts = detectEfforts(run, segment);
    expect(efforts).toHaveLength(1);
    const e = efforts[0];
    // start/end near the slice bounds (allow ±2 for radius capture)
    expect(Math.abs(e.startIdx - 30)).toBeLessThanOrEqual(2);
    expect(Math.abs(e.endIdx - 70)).toBeLessThanOrEqual(2);
    // ~40 fixes × 1s, interpolated to the exact crossings
    expect(e.elapsedSeconds).toBeGreaterThan(35);
    expect(e.elapsedSeconds).toBeLessThan(45);
    expect(e.avgPace).toBeGreaterThan(0);
  });

  it('does not match a run travelling the opposite direction', () => {
    const reversed = reindexTime([...run].reverse(), 0);
    expect(detectEfforts(reversed, segment)).toHaveLength(0);
  });

  it('matches once on an out-and-back (only the forward pass)', () => {
    const back = reindexTime([...run].reverse(), 0);
    const outAndBack = reindexTime([...run, ...back], 0);
    expect(detectEfforts(outAndBack, segment)).toHaveLength(1);
  });

  it('finds two efforts when the segment is lapped twice', () => {
    const twoLaps = reindexTime([...run, ...run], 0);
    expect(detectEfforts(twoLaps, segment)).toHaveLength(2);
  });

  it('still matches with GPS jitter within tolerance', () => {
    const noisy = line(A, B, 100, 0, 2.0); // ~±10 m wobble
    expect(detectEfforts(noisy, segment)).toHaveLength(1);
  });

  it('does not match when the run never reaches the segment end', () => {
    // only the first half of the segment, then veers north
    const half = run.slice(0, 50);
    const veer = line(
      { lat: run[49].lat, lng: run[49].lng },
      { lat: run[49].lat + 0.01, lng: run[49].lng },
      30,
      half[half.length - 1].timestamp + DT
    );
    expect(detectEfforts([...half, ...veer], segment)).toHaveLength(0);
  });

  it('rejects a run that hits both endpoints but ignores the shape (similarity gate)', () => {
    // L-shaped segment: east leg then north leg
    const corner = { lat: 47.0, lng: 8.004 };
    const lStart = { lat: 47.0, lng: 8.0 };
    const lEnd = { lat: 47.004, lng: 8.004 };
    const lSeg: SegmentGeometry = {
      points: [...line(lStart, corner, 20), ...line(corner, lEnd, 20)].map((p) => [p.lat, p.lng]),
      startPoint: lStart,
      endPoint: lEnd,
      distance: trackDistance([...line(lStart, corner, 20), ...line(corner, lEnd, 20)])
    };
    // run cuts the corner: straight diagonal start→end
    const diagonal = line(lStart, lEnd, 60);
    expect(detectEfforts(diagonal, lSeg)).toHaveLength(0);
  });
});

describe('bbox helpers', () => {
  it('computes a bounding box and detects overlap', () => {
    const bb = computeBbox(run)!;
    expect(bb.minLng).toBeCloseTo(8.0, 5);
    expect(bb.maxLng).toBeCloseTo(8.0198, 5);
    const segBb = computeBbox(segment.points as number[][])!;
    expect(bboxIntersects(bb, segBb)).toBe(true);
    const far = { minLat: 48, maxLat: 48.1, minLng: 9, maxLng: 9.1 };
    expect(bboxIntersects(bb, far)).toBe(false);
  });
});

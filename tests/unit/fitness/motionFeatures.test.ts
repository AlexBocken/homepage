import { describe, it, expect } from 'vitest';
import {
	staticFeatures,
	MotionFeatureWindow,
	FEATURE_NAMES,
	FEATURE_DIM,
	WINDOW_FRAMES
} from '$lib/js/motionFeatures';
import { LM, type Landmark } from '$lib/js/poseCoach';

// These tests pin the exact feature computation. They are the ground-truth spec
// the offline training preprocessor (scripts/motion-gate/features.py) must match
// bit-for-bit — if you change a formula here, change it there and update the
// expected numbers below (all hand-computed from the landmark coordinates).

/** Build a 33-point landmark array; only the passed indices are visible. */
function pose(points: Partial<Record<number, [number, number]>>): Landmark[] {
	const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
	for (const [i, xy] of Object.entries(points)) {
		lms[Number(i)] = { x: xy![0], y: xy![1], z: 0, visibility: 1 };
	}
	return lms;
}

/** A symmetric, upright, front-on standing pose with every used landmark visible. */
function uprightPose(shiftX = 0): Landmark[] {
	return pose({
		[LM.leftEar]: [0.45 + shiftX, 0.2],
		[LM.rightEar]: [0.55 + shiftX, 0.2],
		[LM.leftShoulder]: [0.45 + shiftX, 0.3],
		[LM.rightShoulder]: [0.55 + shiftX, 0.3],
		[LM.leftElbow]: [0.45 + shiftX, 0.45],
		[LM.rightElbow]: [0.55 + shiftX, 0.45],
		[LM.leftWrist]: [0.45 + shiftX, 0.6],
		[LM.rightWrist]: [0.55 + shiftX, 0.6],
		[LM.leftHip]: [0.45 + shiftX, 0.6],
		[LM.rightHip]: [0.55 + shiftX, 0.6],
		[LM.leftKnee]: [0.45 + shiftX, 0.8],
		[LM.rightKnee]: [0.55 + shiftX, 0.8],
		[LM.leftAnkle]: [0.45 + shiftX, 1.0],
		[LM.rightAnkle]: [0.55 + shiftX, 1.0]
	});
}

const idx = (name: (typeof FEATURE_NAMES)[number]) => FEATURE_NAMES.indexOf(name);

describe('staticFeatures — upright symmetric pose', () => {
	const { vec, scale } = staticFeatures(uprightPose());

	it('has the right shape', () => {
		expect(vec.length).toBe(FEATURE_DIM);
	});

	it('reads straight limbs as ~180° (normalized 1.0)', () => {
		expect(vec[idx('kneeAngle')]).toBeCloseTo(1, 5);
		expect(vec[idx('elbowAngle')]).toBeCloseTo(1, 5);
		expect(vec[idx('hipAngle')]).toBeCloseTo(1, 5);
		expect(vec[idx('spineAngle')]).toBeCloseTo(1, 5);
	});

	it('reads arms hanging down as 0 shoulder elevation', () => {
		expect(vec[idx('shoulderElev')]).toBeCloseTo(0, 5);
	});

	it('measures torso length as scale (0.3)', () => {
		expect(scale).toBeCloseTo(0.3, 6);
		expect(vec[idx('scale')]).toBeCloseTo(0.3, 6);
	});

	it('is symmetric: no left/right asymmetry, hands at hip height, no spread', () => {
		expect(vec[idx('kneeAsym')]).toBeCloseTo(0, 6);
		expect(vec[idx('ankleAsym')]).toBeCloseTo(0, 6);
		expect(vec[idx('wristHeight')]).toBeCloseTo(0, 6);
		expect(vec[idx('wristSpread')]).toBeCloseTo(0, 6);
	});

	it('reports full track quality and zero velocity channels', () => {
		expect(vec[idx('trackQuality')]).toBeCloseTo(1, 6);
		expect(vec[idx('hipVx')]).toBe(0);
		expect(vec[idx('hipVy')]).toBe(0);
		expect(vec[idx('scaleRate')]).toBe(0);
		expect(vec[idx('motionEnergy')]).toBe(0);
	});
});

describe('staticFeatures — untracked', () => {
	it('returns a dense zero vector with NaN scale when no landmarks', () => {
		const { vec, scale, hip } = staticFeatures(undefined);
		expect(vec.length).toBe(FEATURE_DIM);
		expect(vec.every((v) => v === 0)).toBe(true);
		expect(Number.isNaN(scale)).toBe(true);
		expect(hip).toBeNull();
	});
});

describe('MotionFeatureWindow — velocity channels', () => {
	it('computes hip translation in torso-widths per second', () => {
		const w = new MotionFeatureWindow();
		// Constant +0.05 x-shift every 0.1 s, torso fixed at 0.3, for 1.1 s (ready).
		// Per-step hipVx = (0.05 / 0.3) / 0.1 = 1.6667 torso-widths/s.
		for (let i = 0; i <= 11; i++) w.push(uprightPose(0.05 * i), i * 100);
		const t = w.tensor()!;
		expect(t).not.toBeNull();
		// The window ends at the last (moving) sample, so its final row carries the
		// steady-state velocity; y-motion and scale drift stay zero.
		const last = t.slice((WINDOW_FRAMES - 1) * FEATURE_DIM, WINDOW_FRAMES * FEATURE_DIM);
		expect(last[idx('hipVx')]).toBeCloseTo(1.6667, 3);
		expect(last[idx('hipVy')]).toBeCloseTo(0, 4);
		expect(last[idx('scaleRate')]).toBeCloseTo(0, 4);
	});

	it('is not ready until half the window span is covered', () => {
		const w = new MotionFeatureWindow();
		w.push(uprightPose(), 0);
		w.push(uprightPose(), 100);
		expect(w.ready).toBe(false);
		w.push(uprightPose(), 1100); // span now 1.1s ≥ 1.0s (WINDOW_MS/2)
		expect(w.ready).toBe(true);
	});

	it('emits a fixed WINDOW_FRAMES×FEATURE_DIM tensor once ready', () => {
		const w = new MotionFeatureWindow();
		for (let i = 0; i <= 20; i++) w.push(uprightPose(), i * 100); // 2.0s of history
		const t = w.tensor();
		expect(t).not.toBeNull();
		expect(t!.length).toBe(WINDOW_FRAMES * FEATURE_DIM);
	});

	it('yields constant rows for a perfectly still subject', () => {
		const w = new MotionFeatureWindow();
		for (let i = 0; i <= 30; i++) w.push(uprightPose(), i * 100);
		const t = w.tensor()!;
		// Every resampled frame should equal the steady per-frame vector (velocity 0).
		const row0 = t.slice(0, FEATURE_DIM);
		for (let f = 1; f < WINDOW_FRAMES; f++) {
			const row = t.slice(f * FEATURE_DIM, (f + 1) * FEATURE_DIM);
			for (let k = 0; k < FEATURE_DIM; k++) expect(row[k]).toBeCloseTo(row0[k], 5);
		}
		expect(row0[idx('scale')]).toBeCloseTo(0.3, 5);
	});
});

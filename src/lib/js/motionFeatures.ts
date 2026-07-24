/**
 * Motion-feature extraction for the exercise/locomotion/idle gate.
 *
 * The rep-counting FSM in {@link poseCoach} watches a single joint angle, so it
 * cannot tell an intentional rep from *locomotion* — walking to/from the camera
 * produces knee-flexion cycles (→ "squats") and arm swing (→ "curls"). To veto
 * those, a small temporal classifier looks at a short window of motion and
 * decides whether it's an `in-place rep`, `locomotion`, or `idle`. This module
 * turns raw MediaPipe landmarks into the fixed feature vector that classifier
 * consumes.
 *
 * The features are deliberately **scale- and translation-invariant for pose**
 * (angles, hip-normalized positions) while **keeping the raw image-space
 * translation + scale signals** (hip-centre velocity, torso scale + its rate) —
 * because those raw signals are exactly what separates walking (centroid drifts,
 * scale grows/shrinks) from a rep performed in place. The temporal model on top
 * sees a sequence of these and learns periodicity / left-right phase itself.
 *
 * CRITICAL: this exact computation is mirrored by the offline training
 * preprocessor (scripts/motion-gate/features.py). Any change here must be made
 * there too, or the shipped model sees different features than it trained on.
 * The parity is locked by tests/unit/fitness/motionFeatures.test.ts (fixed
 * landmark inputs → fixed feature vectors) — update both sides together.
 */

import {
	LM,
	jointAngle,
	spineAngle,
	raiseSpread,
	type Landmark
} from '$lib/js/poseCoach';

/**
 * Ordered feature names — the index of each name is its slot in the emitted
 * vector. NEVER reorder or insert in the middle without retraining; append only.
 */
export const FEATURE_NAMES = [
	'kneeAngle', // knee flex, /180 (hip–knee–ankle)
	'elbowAngle', // elbow flex, /180
	'hipAngle', // torso-vs-thigh hinge, /180
	'shoulderElev', // arm elevation, /180 (hip–shoulder–elbow)
	'spineAngle', // ear–shoulder–hip collapse, /180
	'hipVx', // hip-centre horizontal velocity (torso-widths / s) — locomotion signal
	'hipVy', // hip-centre vertical velocity (torso-widths / s) — bob vs stride
	'scale', // torso length in image units (0..1) — distance to camera
	'scaleRate', // d(scale)/dt (per s) — walking toward/away drifts this
	'kneeAsym', // (kneeL − kneeR)/180, signed — in-phase (squat≈0) vs anti-phase (stride)
	'ankleAsym', // (ankleL.y − ankleR.y)/torso — alternating foot strike
	'wristHeight', // (hipMid.y − meanWrist.y)/torso — how high the hands are
	'wristSpread', // lateral wrist spread beyond shoulders (raiseSpread)
	'motionEnergy', // mean |Δangle| over knee/elbow/hip (deg/s, /180) — moving vs idle
	'trackQuality' // mean visibility of core landmarks (0..1)
] as const;

export const FEATURE_DIM = FEATURE_NAMES.length;

/** Frames per emitted window and the wall-clock span they cover. */
export const WINDOW_FRAMES = 32;
export const WINDOW_MS = 2000;

const MIN_VISIBILITY = 0.5;
const EPS = 1e-6;

/** Midpoint of two landmarks; visibility is the min of the pair. */
function mid(a: Landmark | undefined, b: Landmark | undefined): Landmark | undefined {
	if (!a || !b) return undefined;
	return {
		x: (a.x + b.x) / 2,
		y: (a.y + b.y) / 2,
		z: (a.z + b.z) / 2,
		visibility: Math.min(a.visibility ?? 0, b.visibility ?? 0)
	};
}

function vis(p: Landmark | undefined): number {
	return p?.visibility ?? 0;
}

/** y of a landmark if reliably tracked, else NaN. */
function yOf(p: Landmark | undefined): number {
	return p && vis(p) >= MIN_VISIBILITY ? p.y : Number.NaN;
}

/** Mean of the finite inputs, or NaN when none are finite. */
function meanFinite(...vals: number[]): number {
	const ok = vals.filter((v) => Number.isFinite(v));
	return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : Number.NaN;
}

/**
 * Pose-only ("static") features for a single frame: the parts that need no
 * previous frame. Velocity/rate features (hipVx, hipVy, scaleRate, motionEnergy)
 * are filled in by {@link MotionFeatureWindow} which has the timing + history.
 *
 * `scale` (torso length) is returned separately because the windower needs it to
 * differentiate positions into torso-width-per-second velocities.
 */
export interface StaticFeatures {
	/** Partial feature vector: pose slots filled, velocity slots left at 0. */
	vec: Float32Array;
	/** Torso length (shoulder-mid → hip-mid) in image units, or NaN if untracked. */
	scale: number;
	/** Hip-centre position in image units, or null if untracked. */
	hip: { x: number; y: number } | null;
	/** Raw joint angles (deg) used for the velocity/energy terms; NaN if untracked. */
	angles: { knee: number; elbow: number; hip: number };
}

/** Core landmarks whose mean visibility defines `trackQuality`. */
const CORE_LANDMARKS = [
	LM.leftShoulder,
	LM.rightShoulder,
	LM.leftHip,
	LM.rightHip,
	LM.leftKnee,
	LM.rightKnee
];

/**
 * Compute the frame-local (velocity-free) features. Untracked signals become 0
 * in the vector (with `trackQuality` reporting how much was actually visible),
 * so the tensor is always dense and the model can learn to discount low-quality
 * frames via that channel.
 */
export function staticFeatures(lms: Landmark[] | undefined): StaticFeatures {
	const vec = new Float32Array(FEATURE_DIM);
	if (!lms) {
		return { vec, scale: Number.NaN, hip: null, angles: { knee: NaN, elbow: NaN, hip: NaN } };
	}

	const hipMid = mid(lms[LM.leftHip], lms[LM.rightHip]);
	const shoulderMid = mid(lms[LM.leftShoulder], lms[LM.rightShoulder]);
	const torso =
		hipMid && shoulderMid ? Math.hypot(shoulderMid.x - hipMid.x, shoulderMid.y - hipMid.y) : NaN;
	const scale = Number.isFinite(torso) && torso > EPS ? torso : NaN;
	const s = Number.isFinite(scale) ? scale : 1; // safe divisor for normalized terms

	const knee = jointAngle(lms, 'knee');
	const elbow = jointAngle(lms, 'elbow');
	const hip = jointAngle(lms, 'hip');
	const shoulder = jointAngle(lms, 'shoulder');
	const spine = spineAngle(lms);

	const set = (name: (typeof FEATURE_NAMES)[number], v: number) => {
		vec[FEATURE_NAMES.indexOf(name)] = Number.isFinite(v) ? v : 0;
	};

	set('kneeAngle', knee / 180);
	set('elbowAngle', elbow / 180);
	set('hipAngle', hip / 180);
	set('shoulderElev', shoulder / 180);
	set('spineAngle', spine / 180);
	set('scale', scale);

	// Left/right asymmetry: in-phase movement (both knees flex together in a squat)
	// stays near 0; a walking stride swings it (one knee flexes as the other extends).
	const kneeL = tripletAngle(lms, LM.leftHip, LM.leftKnee, LM.leftAnkle);
	const kneeR = tripletAngle(lms, LM.rightHip, LM.rightKnee, LM.rightAnkle);
	if (Number.isFinite(kneeL) && Number.isFinite(kneeR)) set('kneeAsym', (kneeL - kneeR) / 180);

	const ankleLy = yOf(lms[LM.leftAnkle]);
	const ankleRy = yOf(lms[LM.rightAnkle]);
	if (Number.isFinite(ankleLy) && Number.isFinite(ankleRy)) set('ankleAsym', (ankleLy - ankleRy) / s);

	const wristY = meanFinite(yOf(lms[LM.leftWrist]), yOf(lms[LM.rightWrist]));
	if (hipMid && Number.isFinite(wristY)) set('wristHeight', (hipMid.y - wristY) / s);

	set('wristSpread', raiseSpread(lms));

	set('trackQuality', meanFinite(...CORE_LANDMARKS.map((i) => vis(lms[i]))));

	return {
		vec,
		scale,
		hip: hipMid ? { x: hipMid.x, y: hipMid.y } : null,
		angles: { knee, elbow, hip }
	};
}

/** Angle (deg) at vertex `b` for landmark indices a-b-c, or NaN if any is untracked. */
function tripletAngle(lms: Landmark[], a: number, b: number, c: number): number {
	const pa = lms[a];
	const pb = lms[b];
	const pc = lms[c];
	if (!pa || !pb || !pc) return NaN;
	if (vis(pa) < MIN_VISIBILITY || vis(pb) < MIN_VISIBILITY || vis(pc) < MIN_VISIBILITY) return NaN;
	const abx = pa.x - pb.x;
	const aby = pa.y - pb.y;
	const cbx = pc.x - pb.x;
	const cby = pc.y - pb.y;
	const magAb = Math.hypot(abx, aby);
	const magCb = Math.hypot(cbx, cby);
	if (magAb < EPS || magCb < EPS) return NaN;
	const cos = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / (magAb * magCb)));
	return (Math.acos(cos) * 180) / Math.PI;
}

/** One entry in the rolling history: absolute timestamp + its computed features. */
interface Sample {
	t: number;
	f: StaticFeatures;
}

/**
 * Rolling feature window. Push one frame of landmarks per camera frame; it keeps
 * ~{@link WINDOW_MS} of history, fills in the velocity/energy channels from
 * consecutive samples, and on demand resamples to a fixed {@link WINDOW_FRAMES}×
 * {@link FEATURE_DIM} tensor for the classifier (frame-rate independent, so a
 * 24 fps phone and a 60 fps laptop feed the model the same shape).
 */
export class MotionFeatureWindow {
	private history: Sample[] = [];

	reset(): void {
		this.history = [];
	}

	/** Add one frame. `now` is a ms timestamp (monotonic, e.g. performance.now()). */
	push(lms: Landmark[] | undefined, now: number): void {
		const f = staticFeatures(lms);
		const prev = this.history[this.history.length - 1];

		// Velocity/rate channels need the previous sample + elapsed time. Express
		// translation in torso-widths per second so it's distance-invariant.
		if (prev) {
			const dt = (now - prev.t) / 1000;
			if (dt > EPS) {
				const sc = Number.isFinite(f.scale) ? f.scale : Number.isFinite(prev.f.scale) ? prev.f.scale : 1;
				if (f.hip && prev.f.hip) {
					this.setVec(f, 'hipVx', (f.hip.x - prev.f.hip.x) / sc / dt);
					this.setVec(f, 'hipVy', (f.hip.y - prev.f.hip.y) / sc / dt);
				}
				if (Number.isFinite(f.scale) && Number.isFinite(prev.f.scale)) {
					this.setVec(f, 'scaleRate', (f.scale - prev.f.scale) / dt);
				}
				const dAng = meanFinite(
					absDelta(f.angles.knee, prev.f.angles.knee),
					absDelta(f.angles.elbow, prev.f.angles.elbow),
					absDelta(f.angles.hip, prev.f.angles.hip)
				);
				if (Number.isFinite(dAng)) this.setVec(f, 'motionEnergy', dAng / dt / 180);
			}
		}

		this.history.push({ t: now, f });
		// Keep a little more than the window so resampling has an anchor on both ends.
		const cutoff = now - WINDOW_MS * 1.5;
		while (this.history.length > 2 && this.history[0].t < cutoff) this.history.shift();
	}

	private setVec(f: StaticFeatures, name: (typeof FEATURE_NAMES)[number], v: number): void {
		f.vec[FEATURE_NAMES.indexOf(name)] = Number.isFinite(v) ? v : 0;
	}

	/** Enough history to form a meaningful window (≥ half the span, ≥ 2 samples). */
	get ready(): boolean {
		if (this.history.length < 2) return false;
		const span = this.history[this.history.length - 1].t - this.history[0].t;
		return span >= WINDOW_MS * 0.5;
	}

	/**
	 * Resample the last {@link WINDOW_MS} to a fixed {@link WINDOW_FRAMES}×
	 * {@link FEATURE_DIM} row-major tensor, linear-interpolating between samples.
	 * The window ends at the most recent sample; if history is shorter than
	 * WINDOW_MS the earliest sample is held (pad-left). Returns null if not ready.
	 */
	tensor(): Float32Array | null {
		if (!this.ready) return null;
		const end = this.history[this.history.length - 1].t;
		const start = end - WINDOW_MS;
		const out = new Float32Array(WINDOW_FRAMES * FEATURE_DIM);
		for (let i = 0; i < WINDOW_FRAMES; i++) {
			const t = start + (WINDOW_MS * i) / (WINDOW_FRAMES - 1);
			const v = this.sampleAt(t);
			out.set(v, i * FEATURE_DIM);
		}
		return out;
	}

	/** Linear-interpolated feature vector at absolute time `t` (clamped to history). */
	private sampleAt(t: number): Float32Array {
		const h = this.history;
		if (t <= h[0].t) return h[0].f.vec;
		if (t >= h[h.length - 1].t) return h[h.length - 1].f.vec;
		// Find the bracketing pair (linear scan — history is only ~tens of samples).
		let hi = 1;
		while (hi < h.length && h[hi].t < t) hi++;
		const a = h[hi - 1];
		const b = h[hi];
		const span = b.t - a.t;
		const w = span > EPS ? (t - a.t) / span : 0;
		const out = new Float32Array(FEATURE_DIM);
		for (let k = 0; k < FEATURE_DIM; k++) out[k] = a.f.vec[k] + (b.f.vec[k] - a.f.vec[k]) * w;
		return out;
	}
}

/** |a − b| when both finite, else NaN. */
function absDelta(a: number, b: number): number {
	return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) : NaN;
}

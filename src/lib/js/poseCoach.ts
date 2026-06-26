/**
 * Pose-based form coaching for strength lifts.
 *
 * Takes MediaPipe Pose landmarks (33 points, normalized 0..1) and runs a small
 * per-exercise finite state machine over a single joint angle to count reps and
 * surface live form cues. This is the browser-native re-implementation of the
 * approach in danielguarnizo/pose-estimation-for-fitness-exercise-analysis —
 * we keep MediaPipe for landmarks but replace its trained Random-Forest phase
 * classifier with explainable joint-angle heuristics (no model files, no
 * per-camera retraining needed).
 *
 * Only the three lifts the source project supports are configured here; any
 * other exercise simply has no config and the coach stays idle.
 *
 * Coaching messages are returned as i18n keys (see fitness/{de,en}.ts), not
 * text — the engine itself is language-agnostic; the UI resolves the keys.
 */

import type { FitnessKey } from '$lib/js/fitnessI18n';

/** A single MediaPipe pose landmark (normalized image coords + visibility). */
export interface Landmark {
	x: number;
	y: number;
	z: number;
	visibility?: number;
}

/** MediaPipe Pose landmark indices we care about (BlazePose 33-point topology). */
export const LM = {
	leftEar: 7,
	rightEar: 8,
	leftShoulder: 11,
	rightShoulder: 12,
	leftElbow: 13,
	rightElbow: 14,
	leftWrist: 15,
	rightWrist: 16,
	leftHip: 23,
	rightHip: 24,
	leftKnee: 25,
	rightKnee: 26,
	leftAnkle: 27,
	rightAnkle: 28
} as const;

type JointName = 'knee' | 'elbow' | 'hip' | 'shoulder';

/** Triplet of landmark indices (a, vertex, c) whose angle at the vertex we measure. */
type AngleTriplet = readonly [number, number, number];

interface SideTriplets {
	left: AngleTriplet;
	right: AngleTriplet;
}

const JOINT_TRIPLETS: Record<JointName, SideTriplets> = {
	// knee angle: hip → knee → ankle
	knee: {
		left: [LM.leftHip, LM.leftKnee, LM.leftAnkle],
		right: [LM.rightHip, LM.rightKnee, LM.rightAnkle]
	},
	// elbow angle: shoulder → elbow → wrist
	elbow: {
		left: [LM.leftShoulder, LM.leftElbow, LM.leftWrist],
		right: [LM.rightShoulder, LM.rightElbow, LM.rightWrist]
	},
	// hip angle (torso vs thigh): shoulder → hip → knee
	hip: {
		left: [LM.leftShoulder, LM.leftHip, LM.leftKnee],
		right: [LM.rightShoulder, LM.rightHip, LM.rightKnee]
	},
	// shoulder elevation (arm raise): hip → shoulder → elbow
	shoulder: {
		left: [LM.leftHip, LM.leftShoulder, LM.leftElbow],
		right: [LM.rightHip, LM.rightShoulder, LM.rightElbow]
	}
};

/**
 * Spine-line triplet (ear → shoulder → hip). With a neutral back these three
 * points are roughly collinear (~165-180°); when the upper back rounds the head
 * drops forward and the angle closes. This is a single-camera *proxy* for spine
 * flexion — BlazePose has no mid-spine landmarks, so we can't measure true
 * curvature, only this ear/shoulder/hip collapse. Best filmed side-on.
 */
const SPINE_TRIPLETS: SideTriplets = {
	left: [LM.leftEar, LM.leftShoulder, LM.leftHip],
	right: [LM.rightEar, LM.rightShoulder, LM.rightHip]
};

export interface FormConfig {
	/** Which joint angle drives the rep counter. */
	joint: JointName;
	/**
	 * Threshold angles, expressed as REAL joint angles (deg):
	 * - `topAngle`    — the relaxed / rest position (a rep starts and ends here)
	 * - `bottomAngle` — the working threshold the movement must pass to arm a rep
	 * - `depthTarget` — the ideal peak; not reaching it triggers the `shallowCue`
	 *
	 * For normal lifts (squat, curl, bench) the peak is the LOW-angle end, so
	 * top > bottom > depth. For `invert` lifts (presses, raises, hip thrust) the
	 * peak is the HIGH-angle end, so top < bottom < depth.
	 */
	topAngle: number;
	bottomAngle: number;
	depthTarget: number;
	/** Set when peak effort is at the high-angle end (lockout / arm raised) rather than the low end. */
	invert?: boolean;
	/** When set, a rep only counts if it actually reaches `depthTarget` — partial reps don't count. */
	requireDepth?: boolean;
	/**
	 * Preferred camera framing. Standing movements (the default) want a taller,
	 * portrait crop so the whole body fits; lying/seated movements (bench, hip
	 * thrust, leg press) want a wide crop.
	 */
	orientation?: 'tall' | 'wide';
	/** i18n key for the cue when the rep doesn't reach `depthTarget`. */
	shallowCue: FitnessKey;
	/** Optional spine-flexion ("rounded back") check, evaluated while under load. */
	backRounding?: {
		/** Flag a fault when the ear–shoulder–hip angle drops below this (deg). */
		minAngle: number;
		cue: FitnessKey;
	};
	/** Optional plane + height coaching for shoulder-raise variants (lateral vs front). */
	raise?: RaiseCheck;
	/** Optional bent-over checks for free rows (hip hinge + over-pull). */
	row?: RowCheck;
}

/**
 * Live checks for the free bent-over barbell row. The torso must stay hinged —
 * so a standing curl/upright lift can't score as a row — and the bar shouldn't be
 * yanked up past the lower chest (which over-flexes the elbow).
 */
interface RowCheck {
	/** Torso must be hinged: the hip angle (shoulder–hip–knee) has to be at/below this to count a rep. */
	maxHipAngle: number;
	/** Advice when standing too upright instead of hinging at the hips. */
	hingeCue: FitnessKey;
	/** Upper-arm elevation (deg) above which the elbow is yanked too high (bar to the chest/neck). */
	maxElevation: number;
	/** Advice when the bar is pulled too high. */
	tooHighCue: FitnessKey;
}

/**
 * Live checks for dumbbell/cable raises: the *plane* the arms travel in (out to
 * the sides vs. in front of the chest) and the *height* they reach. The plane
 * check reads the wrists' sideways spread, so it only works front-on (it no-ops
 * side-on, where the shoulders overlap); the height check uses the shoulder angle.
 */
interface RaiseCheck {
	/** Where the hands belong at the top: `lateral` = out to the sides, `front` = in front of the chest. */
	plane: 'lateral' | 'front';
	/** Cue when the wrists are in the wrong plane for this lift. */
	planeCue: FitnessKey;
	/** Real shoulder-elevation angle (deg) past which the rep has gone above shoulder height. */
	overAngle: number;
	/** Cue when raised too high (e.g. swinging the weights up / shrugging the traps in). */
	overCue: FitnessKey;
}

/** Reused back-rounding (spine-flexion) checks. */
const SQUAT_BACK_ROUNDING = { minAngle: 150, cue: 'coach_cue_back_round_squat' } as const;
const HINGE_BACK_ROUNDING = { minAngle: 150, cue: 'coach_cue_back_round_hinge' } as const;

/** Reused depth/ROM cue keys (resolved via i18n in the UI). */
const CUE = {
	squatDeeper: 'coach_cue_squat_deeper',
	lowerToChest: 'coach_cue_lower_to_chest',
	curlUp: 'coach_cue_curl_up',
	hingeDeeper: 'coach_cue_hinge_deeper',
	rowToTorso: 'coach_cue_row_to_torso',
	chinOverBar: 'coach_cue_chin_over_bar',
	fullLockout: 'coach_cue_full_lockout',
	hipLockout: 'coach_cue_hip_lockout',
	shoulderHeight: 'coach_cue_shoulder_height',
	pullHigher: 'coach_cue_pull_higher',
	lowerBehindHead: 'coach_cue_lower_behind_head',
	raiseToSides: 'coach_cue_raise_to_sides',
	raiseInFront: 'coach_cue_raise_in_front',
	notAboveShoulder: 'coach_cue_not_above_shoulder',
	hingeOver: 'coach_cue_hinge_over',
	rowTooHigh: 'coach_cue_row_too_high'
} as const satisfies Record<string, FitnessKey>;

/**
 * Per-exercise form configs, keyed by the exercise `id` from exercises.ts.
 * Covers the movements used in the app's default templates (defaultTemplates.ts).
 * Stretches, yoga, crunches and calf raises are intentionally absent — their ROM
 * or landmarks aren't reliable for single-camera angle tracking.
 */
export const FORM_CONFIGS: Record<string, FormConfig> = {
	// --- Squat pattern (knee, peak = low) — require depth so partial reps don't count ---
	'squat-barbell': {
		joint: 'knee', topAngle: 160, bottomAngle: 110, depthTarget: 95, requireDepth: true,
		shallowCue: CUE.squatDeeper, backRounding: SQUAT_BACK_ROUNDING
	},
	'front-squat-barbell': {
		joint: 'knee', topAngle: 160, bottomAngle: 110, depthTarget: 95, requireDepth: true,
		shallowCue: CUE.squatDeeper, backRounding: SQUAT_BACK_ROUNDING
	},
	'goblet-squat-dumbbell': {
		joint: 'knee', topAngle: 160, bottomAngle: 110, depthTarget: 95, requireDepth: true,
		shallowCue: CUE.squatDeeper, backRounding: SQUAT_BACK_ROUNDING
	},
	'bulgarian-split-squat-dumbbell': {
		joint: 'knee', topAngle: 160, bottomAngle: 105, depthTarget: 95, requireDepth: true, shallowCue: CUE.squatDeeper
	},
	'lunge-dumbbell': {
		joint: 'knee', topAngle: 160, bottomAngle: 105, depthTarget: 95, requireDepth: true, shallowCue: CUE.squatDeeper
	},
	'leg-press-machine': {
		joint: 'knee', orientation: 'wide', topAngle: 165, bottomAngle: 110, depthTarget: 95, requireDepth: true, shallowCue: CUE.squatDeeper
	},

	// --- Hip hinge (hip, peak = low) ---
	'deadlift-barbell': {
		joint: 'hip', topAngle: 165, bottomAngle: 120, depthTarget: 110,
		shallowCue: CUE.hingeDeeper, backRounding: HINGE_BACK_ROUNDING
	},
	'romanian-deadlift-barbell': {
		joint: 'hip', topAngle: 163, bottomAngle: 110, depthTarget: 95,
		shallowCue: CUE.hingeDeeper, backRounding: HINGE_BACK_ROUNDING
	},
	'romanian-deadlift-dumbbell': {
		joint: 'hip', topAngle: 163, bottomAngle: 110, depthTarget: 95,
		shallowCue: CUE.hingeDeeper, backRounding: HINGE_BACK_ROUNDING
	},

	// --- Horizontal press (elbow, peak = low) ---
	'bench-press-barbell': {
		joint: 'elbow', orientation: 'wide', topAngle: 155, bottomAngle: 100, depthTarget: 90, shallowCue: CUE.lowerToChest
	},
	'bench-press-dumbbell': {
		joint: 'elbow', orientation: 'wide', topAngle: 155, bottomAngle: 100, depthTarget: 90, shallowCue: CUE.lowerToChest
	},
	'incline-bench-press-barbell': {
		joint: 'elbow', orientation: 'wide', topAngle: 155, bottomAngle: 100, depthTarget: 90, shallowCue: CUE.lowerToChest
	},
	'bench-press-close-grip-barbell': {
		joint: 'elbow', orientation: 'wide', topAngle: 158, bottomAngle: 100, depthTarget: 92, shallowCue: CUE.lowerToChest
	},
	'skullcrusher-dumbbell': {
		joint: 'elbow', orientation: 'wide', topAngle: 165, bottomAngle: 65, depthTarget: 55, shallowCue: CUE.lowerBehindHead
	},

	// --- Curls (elbow, peak = low) ---
	'bicep-curl-barbell': {
		joint: 'elbow', topAngle: 155, bottomAngle: 70, depthTarget: 55, shallowCue: CUE.curlUp
	},
	'bicep-curl-dumbbell': {
		joint: 'elbow', topAngle: 155, bottomAngle: 70, depthTarget: 55, shallowCue: CUE.curlUp
	},
	'cable-curl': {
		joint: 'elbow', topAngle: 155, bottomAngle: 70, depthTarget: 55, shallowCue: CUE.curlUp
	},
	'hammer-curl-dumbbell': {
		joint: 'elbow', topAngle: 155, bottomAngle: 70, depthTarget: 55, shallowCue: CUE.curlUp
	},

	// --- Rows & pulls (elbow, peak = low) ---
	// Counted from shoulder extension (upper-arm elevation), NOT the elbow — the
	// elbow angle can't tell a row from a curl. top/bottom/depth here are upper-arm
	// elevations in deg: ~−80° hanging, 0° = elbow at shoulder height. invert+peak
	// is the high (raised) end; requireDepth so a half-pull doesn't count.
	'bent-over-row-barbell': {
		joint: 'shoulder', invert: true, requireDepth: true,
		topAngle: -55, bottomAngle: -30, depthTarget: -10,
		shallowCue: CUE.rowToTorso, backRounding: HINGE_BACK_ROUNDING,
		row: { maxHipAngle: 150, hingeCue: CUE.hingeOver, maxElevation: 40, tooHighCue: CUE.rowTooHigh }
	},
	'incline-row-dumbbell': {
		joint: 'elbow', topAngle: 160, bottomAngle: 80, depthTarget: 65, shallowCue: CUE.rowToTorso
	},
	'pull-up': {
		joint: 'elbow', topAngle: 165, bottomAngle: 70, depthTarget: 55, shallowCue: CUE.chinOverBar
	},
	'chin-up': {
		joint: 'elbow', topAngle: 165, bottomAngle: 70, depthTarget: 55, shallowCue: CUE.chinOverBar
	},

	// --- Overhead press (elbow, peak = HIGH → invert) ---
	'overhead-press-barbell': {
		joint: 'elbow', invert: true, topAngle: 95, bottomAngle: 150, depthTarget: 163,
		shallowCue: CUE.fullLockout
	},
	'overhead-press-dumbbell': {
		joint: 'elbow', invert: true, topAngle: 95, bottomAngle: 150, depthTarget: 163,
		shallowCue: CUE.fullLockout
	},

	// --- Hip thrust (hip, peak = HIGH → invert) ---
	'hip-thrust-barbell': {
		joint: 'hip', invert: true, orientation: 'wide', topAngle: 100, bottomAngle: 150, depthTarget: 165,
		shallowCue: CUE.hipLockout
	},

	// --- Raises (shoulder elevation, peak = HIGH → invert) ---
	// `raise` adds plane (sides vs. front) + over-height coaching on top of the
	// shared shoulder-height depth target.
	'lateral-raise-dumbbell': {
		joint: 'shoulder', invert: true, topAngle: 25, bottomAngle: 70, depthTarget: 80,
		shallowCue: CUE.shoulderHeight,
		raise: { plane: 'lateral', planeCue: CUE.raiseToSides, overAngle: 105, overCue: CUE.notAboveShoulder }
	},
	'lateral-raise-cable': {
		joint: 'shoulder', invert: true, topAngle: 25, bottomAngle: 70, depthTarget: 80,
		shallowCue: CUE.shoulderHeight,
		raise: { plane: 'lateral', planeCue: CUE.raiseToSides, overAngle: 105, overCue: CUE.notAboveShoulder }
	},
	'front-raise-dumbbell': {
		joint: 'shoulder', invert: true, topAngle: 25, bottomAngle: 65, depthTarget: 75,
		shallowCue: CUE.shoulderHeight,
		raise: { plane: 'front', planeCue: CUE.raiseInFront, overAngle: 110, overCue: CUE.notAboveShoulder }
	},
	'upright-row-barbell': {
		joint: 'shoulder', invert: true, topAngle: 20, bottomAngle: 50, depthTarget: 58,
		shallowCue: CUE.pullHigher
	}
};

export function hasFormConfig(exerciseId: string): boolean {
	return exerciseId in FORM_CONFIGS;
}

/** Angle in degrees at vertex `b` formed by points a-b-c. */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
	const abx = a.x - b.x;
	const aby = a.y - b.y;
	const cbx = c.x - b.x;
	const cby = c.y - b.y;
	const dot = abx * cbx + aby * cby;
	const magAb = Math.hypot(abx, aby);
	const magCb = Math.hypot(cbx, cby);
	if (magAb === 0 || magCb === 0) return Number.NaN;
	const cos = Math.min(1, Math.max(-1, dot / (magAb * magCb)));
	return (Math.acos(cos) * 180) / Math.PI;
}

const MIN_VISIBILITY = 0.5;

function tripletVisible(lms: Landmark[], [a, b, c]: AngleTriplet): boolean {
	return [a, b, c].every((i) => (lms[i]?.visibility ?? 0) >= MIN_VISIBILITY);
}

/**
 * Measured angle for a left/right triplet pair, averaging both sides when both
 * are visible (front-on view) and falling back to whichever side is visible
 * (side-on view). Returns NaN when neither side is reliably tracked.
 */
function measureAngle(lms: Landmark[], { left, right }: SideTriplets): number {
	const leftOk = tripletVisible(lms, left);
	const rightOk = tripletVisible(lms, right);
	const la = leftOk ? angleDeg(lms[left[0]], lms[left[1]], lms[left[2]]) : Number.NaN;
	const ra = rightOk ? angleDeg(lms[right[0]], lms[right[1]], lms[right[2]]) : Number.NaN;
	if (leftOk && rightOk) return (la + ra) / 2;
	if (leftOk) return la;
	if (rightOk) return ra;
	return Number.NaN;
}

/** Measured joint angle (knee/elbow/hip) for this frame, or NaN if untracked. */
export function jointAngle(lms: Landmark[], joint: JointName): number {
	return measureAngle(lms, JOINT_TRIPLETS[joint]);
}

/** Spine-line angle (ear–shoulder–hip); lower = more rounded. NaN if untracked. */
export function spineAngle(lms: Landmark[]): number {
	return measureAngle(lms, SPINE_TRIPLETS);
}

/** y of landmark `i` if reliably tracked, else NaN. */
function visibleY(lms: Landmark[], i: number): number {
	const p = lms[i];
	return p && (p.visibility ?? 0) >= MIN_VISIBILITY ? p.y : Number.NaN;
}

/** Mean of the non-NaN inputs, or NaN when all are NaN. */
function meanDefined(...vals: number[]): number {
	const ok = vals.filter((v) => !Number.isNaN(v));
	return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : Number.NaN;
}

/**
 * How far the wrists are spread sideways *beyond* the shoulders, as a fraction of
 * shoulder width (front-on view): high (~0.6+) = arms out to the sides (lateral
 * raise); ~0 or negative = hands kept in front of the chest (front raise). NaN
 * when filmed side-on (shoulders overlap) or the wrists/shoulders aren't tracked.
 */
export function raiseSpread(lms: Landmark[]): number {
	const ls = lms[LM.leftShoulder];
	const rs = lms[LM.rightShoulder];
	if (!ls || !rs) return Number.NaN;
	const width = Math.abs(ls.x - rs.x);
	if (width < 0.08) return Number.NaN; // side-on: shoulders overlap, spread is meaningless
	const center = (ls.x + rs.x) / 2;
	const spreads: number[] = [];
	for (const [sh, wr] of [
		[LM.leftShoulder, LM.leftWrist],
		[LM.rightShoulder, LM.rightWrist]
	] as const) {
		const s = lms[sh];
		const w = lms[wr];
		if (!s || !w) continue;
		if ((s.visibility ?? 0) < MIN_VISIBILITY || (w.visibility ?? 0) < MIN_VISIBILITY) continue;
		spreads.push((Math.abs(w.x - center) - Math.abs(s.x - center)) / width);
	}
	if (!spreads.length) return Number.NaN;
	return spreads.reduce((a, b) => a + b, 0) / spreads.length;
}

/**
 * Elevation of the upper arm above horizontal (deg), averaged over visible sides:
 * −90° = elbow hanging straight below the shoulder, 0° = elbow at shoulder height,
 * +90° = straight overhead. This is the shoulder-extension signal a bent-over row
 * is judged on (the elbow driving up toward the torso). Unlike the shoulder *angle*
 * (hip–shoulder–elbow), it stays monotonic through the whole pull. Best filmed
 * side-on. NaN when neither shoulder/elbow pair is tracked.
 */
export function upperArmElevation(lms: Landmark[]): number {
	const vals: number[] = [];
	for (const [sh, el] of [
		[LM.leftShoulder, LM.leftElbow],
		[LM.rightShoulder, LM.rightElbow]
	] as const) {
		const s = lms[sh];
		const e = lms[el];
		if (!s || !e) continue;
		if ((s.visibility ?? 0) < MIN_VISIBILITY || (e.visibility ?? 0) < MIN_VISIBILITY) continue;
		// y grows downward, so (shoulderY − elbowY) is positive when the elbow is up.
		vals.push((Math.atan2(s.y - e.y, Math.abs(e.x - s.x)) * 180) / Math.PI);
	}
	if (!vals.length) return Number.NaN;
	return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** At least one hip landmark reliably tracked — a cheap "is the body actually in frame" gate. */
function hipInFrame(lms: Landmark[] | undefined): boolean {
	if (!lms) return false;
	return (
		(lms[LM.leftHip]?.visibility ?? 0) >= MIN_VISIBILITY ||
		(lms[LM.rightHip]?.visibility ?? 0) >= MIN_VISIBILITY
	);
}

/** True when a wrist is up around shoulder height (above mid-torso) — robust to foreshortening. */
function wristsRaised(lms: Landmark[]): boolean {
	const shY = meanDefined(visibleY(lms, LM.leftShoulder), visibleY(lms, LM.rightShoulder));
	const hipY = meanDefined(visibleY(lms, LM.leftHip), visibleY(lms, LM.rightHip));
	if (Number.isNaN(shY) || Number.isNaN(hipY)) return false;
	const midTorso = (shY + hipY) / 2;
	const lw = visibleY(lms, LM.leftWrist);
	const rw = visibleY(lms, LM.rightWrist);
	return (!Number.isNaN(lw) && lw < midTorso) || (!Number.isNaN(rw) && rw < midTorso);
}

export type RepPhase = 'top' | 'descending' | 'bottom' | 'ascending';

export interface CoachUpdate {
	/** Total completed reps so far. */
	reps: number;
	/** Current movement phase. */
	phase: RepPhase;
	/** Measured joint angle this frame (deg), or null if the body isn't tracked. */
	angle: number | null;
	/** Fired exactly once on the frame a rep completes. */
	repCompleted: boolean;
	/** i18n key for the last completed rep's verdict (depth / tracking hint), or null. */
	cue: FitnessKey | null;
	/** Severity of `cue`, so the UI can colour it. */
	cueKind: CueKind;
	/** i18n keys for live form faults this frame (e.g. rounded back). Empty when form looks OK. */
	faults: FitnessKey[];
}

/** Tone of a coaching message: a clean rep, a correction to apply, or a neutral hint. */
export type CueKind = 'good' | 'advice' | 'info' | null;

/**
 * Minimum wall-clock gap between two *counted* reps. Rejects bounces and
 * double-counts at the top of a rep where the angle can jitter across the gate.
 */
const MIN_REP_INTERVAL_MS = 1000;

/**
 * Stateful per-exercise rep counter + form critic. Feed it one frame of
 * landmarks at a time via {@link update}.
 */
export class ExerciseCoach {
	readonly config: FormConfig;

	private reps = 0;
	/** Timestamp (ms) of the last counted rep, for the {@link MIN_REP_INTERVAL_MS} guard. */
	private lastRepTime = -Infinity;
	private phase: RepPhase = 'top';
	/** Lowest sign-normalized angle seen since leaving rest — the peak depth of the current rep. */
	private repMinE = Number.POSITIVE_INFINITY;
	/** Frames in a row with no reliable tracking, used to debounce the "no body" cue. */
	private lostFrames = 0;
	/** Sticky cue key from the last completed rep (e.g. a depth warning). */
	private lastRepCue: FitnessKey | null = null;
	private lastRepCueKind: CueKind = null;
	/** Debounce counter for the back-rounding fault (avoids single-frame flicker). */
	private backRoundFrames = 0;
	/** Debounce counters for the raise plane / over-height faults. */
	private raisePlaneFrames = 0;
	private overRaiseFrames = 0;
	/** Debounce counters for the bent-over-row hinge / over-pull faults. */
	private rowHingeFrames = 0;
	private rowTooHighFrames = 0;

	constructor(exerciseId: string) {
		const config = FORM_CONFIGS[exerciseId];
		if (!config) throw new Error(`No form config for exercise "${exerciseId}"`);
		this.config = config;
	}

	get repCount(): number {
		return this.reps;
	}

	reset(): void {
		this.reps = 0;
		this.lastRepTime = -Infinity;
		this.phase = 'top';
		this.repMinE = Number.POSITIVE_INFINITY;
		this.lostFrames = 0;
		this.lastRepCue = null;
		this.lastRepCueKind = null;
		this.backRoundFrames = 0;
		this.raisePlaneFrames = 0;
		this.overRaiseFrames = 0;
		this.rowHingeFrames = 0;
		this.rowTooHighFrames = 0;
	}

	/** Advance the state machine by one frame. `now` is a ms timestamp (defaults to {@link performance.now}). */
	update(lms: Landmark[] | undefined, now: number = performance.now()): CoachUpdate {
		// A row is counted off shoulder extension (upper-arm elevation); everything
		// else off its configured joint angle.
		const rowCfg = this.config.row;
		const angle = lms
			? rowCfg
				? upperArmElevation(lms)
				: jointAngle(lms, this.config.joint)
			: Number.NaN;

		// Require the hip in frame for every lift — it's the cheapest guard against
		// erroneous counts when the body is only partly visible (e.g. walking to/from
		// the camera). A bent-over row needs the whole hip *angle* (shoulder–hip–knee,
		// which also pulls in the knee) to tell a real row from a standing lift.
		const hipAngle = rowCfg && lms ? jointAngle(lms, 'hip') : Number.NaN;
		const untracked =
			Number.isNaN(angle) || !hipInFrame(lms) || (rowCfg !== undefined && Number.isNaN(hipAngle));

		if (untracked) {
			this.lostFrames++;
			this.backRoundFrames = 0;
			const lost = this.lostFrames > 5;
			// Once the "get your whole body in frame" warning is relevant, abandon the
			// in-progress rep so a rep that spanned the tracking gap can't complete on
			// recovery — only reps observed end-to-end with tracking are counted.
			if (lost) {
				this.phase = 'top';
				this.repMinE = Number.POSITIVE_INFINITY;
				this.raisePlaneFrames = 0;
				this.overRaiseFrames = 0;
				this.rowHingeFrames = 0;
				this.rowTooHighFrames = 0;
			}
			const cue: FitnessKey | null = lost ? 'coach_cue_get_in_frame' : this.lastRepCue;
			const cueKind: CueKind = lost ? 'info' : this.lastRepCueKind;
			return {
				reps: this.reps,
				phase: this.phase,
				angle: null,
				repCompleted: false,
				cue,
				cueKind,
				faults: []
			};
		}
		this.lostFrames = 0;

		// Bent-over rows: is the torso actually hinged? `hipAngle` is guaranteed
		// tracked here (untracked is handled above as "get in frame").
		const hinged = !rowCfg || hipAngle <= rowCfg.maxHipAngle;

		// Work in sign-normalized space so the same FSM handles both polarities:
		// `e` is high at rest and low at peak effort for every exercise.
		const sign = this.config.invert ? -1 : 1;
		const e = sign * angle;
		const topE = sign * this.config.topAngle;
		const bottomE = sign * this.config.bottomAngle;
		const depthE = sign * this.config.depthTarget;
		// Lenient gate to *count* a rep — partway from rest toward the full bottom —
		// so even sub-par-depth reps register. depthTarget then only decides whether
		// the rep is praised ('good') or flagged for more range ('advice').
		const gateE = bottomE + (topE - bottomE) * 0.35;
		let repCompleted = false;

		// Track the peak (lowest e) of the current in-progress rep.
		if (this.phase !== 'top') this.repMinE = Math.min(this.repMinE, e);

		switch (this.phase) {
			case 'top':
				if (e < topE) {
					this.phase = 'descending';
					this.repMinE = e;
				}
				break;
			case 'descending':
				if (e <= gateE) this.phase = 'bottom';
				else if (e >= topE) this.phase = 'top'; // aborted, never dipped enough to count
				break;
			case 'bottom':
				if (e > gateE) this.phase = 'ascending';
				break;
			case 'ascending':
				if (e >= topE) {
					// Returned to rest after a valid peak. Only *count* it if enough
					// time has passed since the last rep — otherwise it's a bounce.
					const spaced = now - this.lastRepTime >= MIN_REP_INTERVAL_MS;
					const shallow = this.repMinE > depthE;
					if (spaced && hinged && !(this.config.requireDepth && shallow)) {
						this.reps++;
						this.lastRepTime = now;
						repCompleted = true;
						if (shallow) {
							this.lastRepCue = this.config.shallowCue;
							this.lastRepCueKind = 'advice';
						} else {
							this.lastRepCue = 'coach_cue_good_rep';
							this.lastRepCueKind = 'good';
						}
					} else if (spaced && rowCfg && !hinged) {
						// The arms completed the motion but the torso never hinged —
						// it's a standing lift, not a row. Coach it instead of counting.
						this.lastRepCue = rowCfg.hingeCue;
						this.lastRepCueKind = 'advice';
					} else if (spaced && this.config.requireDepth && shallow) {
						// Didn't reach depth — coach it instead of counting the partial rep.
						this.lastRepCue = this.config.shallowCue;
						this.lastRepCueKind = 'advice';
					}
					// Reset the movement either way so the next rep starts clean.
					this.phase = 'top';
					this.repMinE = Number.POSITIVE_INFINITY;
				} else if (e <= gateE) {
					this.phase = 'bottom'; // dipped back down before finishing
				}
				break;
		}

		// Live form faults — only meaningful while under load (not standing at the top).
		const faults: FitnessKey[] = [];
		const br = this.config.backRounding;
		if (br && lms && this.phase !== 'top') {
			const sa = spineAngle(lms);
			if (!Number.isNaN(sa) && sa < br.minAngle) {
				this.backRoundFrames = Math.min(this.backRoundFrames + 1, 10);
			} else {
				this.backRoundFrames = Math.max(this.backRoundFrames - 1, 0);
			}
			if (this.backRoundFrames >= 3) faults.push(br.cue);
		} else {
			this.backRoundFrames = 0;
		}

		// Raise plane (sides vs. front) + over-height. Both judged only while the
		// arms are actually up, and debounced so a single noisy frame can't flash.
		const rz = this.config.raise;
		if (rz && lms && this.phase !== 'top' && wristsRaised(lms)) {
			const spread = raiseSpread(lms);
			// lateral wants the wrists wide of the shoulders; front wants them in
			// front of the chest. NaN (side-on) → skip, can't judge the plane.
			const planeWrong =
				!Number.isNaN(spread) && (rz.plane === 'lateral' ? spread < 0.2 : spread > 0.45);
			this.raisePlaneFrames = planeWrong
				? Math.min(this.raisePlaneFrames + 1, 10)
				: Math.max(this.raisePlaneFrames - 1, 0);
			if (this.raisePlaneFrames >= 4) faults.push(rz.planeCue);

			const tooHigh = angle > rz.overAngle;
			this.overRaiseFrames = tooHigh
				? Math.min(this.overRaiseFrames + 1, 10)
				: Math.max(this.overRaiseFrames - 1, 0);
			if (this.overRaiseFrames >= 4) faults.push(rz.overCue);
		} else {
			this.raisePlaneFrames = 0;
			this.overRaiseFrames = 0;
		}

		// Bent-over row: nag if standing too upright, or if the elbow is driven up so
		// high the bar's gone past the chest. Judged under load, debounced like the others.
		if (rowCfg && lms && this.phase !== 'top') {
			const upright = !Number.isNaN(hipAngle) && hipAngle > rowCfg.maxHipAngle;
			this.rowHingeFrames = upright
				? Math.min(this.rowHingeFrames + 1, 10)
				: Math.max(this.rowHingeFrames - 1, 0);
			if (this.rowHingeFrames >= 4) faults.push(rowCfg.hingeCue);

			// `angle` is the upper-arm elevation here; too high = bar pulled past the chest.
			const overPulled = angle > rowCfg.maxElevation;
			this.rowTooHighFrames = overPulled
				? Math.min(this.rowTooHighFrames + 1, 10)
				: Math.max(this.rowTooHighFrames - 1, 0);
			if (this.rowTooHighFrames >= 4) faults.push(rowCfg.tooHighCue);
		} else {
			this.rowHingeFrames = 0;
			this.rowTooHighFrames = 0;
		}

		return {
			reps: this.reps,
			phase: this.phase,
			angle,
			repCompleted,
			cue: this.lastRepCue,
			cueKind: this.lastRepCueKind,
			faults
		};
	}
}

/**
 * Subset of the MediaPipe Pose skeleton connections for drawing an overlay.
 * Index pairs into the 33-point landmark array.
 */
export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
	// arms
	[11, 13],
	[13, 15],
	[12, 14],
	[14, 16],
	// shoulders + torso
	[11, 12],
	[11, 23],
	[12, 24],
	[23, 24],
	// legs
	[23, 25],
	[25, 27],
	[24, 26],
	[26, 28]
];

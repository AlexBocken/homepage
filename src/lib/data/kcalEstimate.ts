/**
 * Kilocalorie estimation for strength training based on:
 *
 *   Lytle, J.R. et al. (2019) "Predicting Energy Expenditure of an Acute
 *   Resistance Exercise Bout in Men and Women."
 *   Med. Sci. Sports Exerc., 51(7), pp.1532–1537.
 *   DOI: 10.1249/MSS.0000000000001925
 *
 * The paper provides a multiple-linear-regression model trained on indirect
 * calorimetry (VO₂) from 52 subjects performing 7 resistance exercises at
 * 60–70 % 1RM.  The model predicts **net** kilocalories (total minus resting
 * metabolic cost) from demographic and training-volume variables.
 *
 * ─── Total bout equation (R² = 0.773, SEE = 28.5 kcal) ───────────────────
 *
 *   Net kcal = 0.874·height_cm − 0.596·age_yr − 1.016·fat_mass_kg
 *            + 1.638·lean_mass_kg + 2.461·(TV / 1000) − 110.742
 *
 * where TV = Σ(sets × reps × weight_kg) across the workout.
 *
 * NOTE: The published abstract prints the TV scaling factor as "×10⁻²" but
 * verification against the paper's own reported means (male = 161.2 kcal)
 * shows the correct factor is **×10⁻³** (i.e. TV / 1000).  The Table 2
 * column header "Volume m³ (kg)" confirms this.
 *
 * ─── Individual exercise equations (Table 2) ─────────────────────────────
 *
 * Seven exercise-specific equations are also provided.  In these, the
 * "Weight (kg)" coefficient applies to the exercise weight / 100 and the
 * "Volume" coefficient applies to exercise TV / 1000.  (Verified by
 * back-calculating against the study's reported demographics and means.)
 *
 * ─── Limitations & uncertainty ────────────────────────────────────────────
 *
 * • Calibrated on Keiser pneumatic machines, 60–70 % 1RM, 2–3 sets of
 *   8–12 reps.  Accuracy degrades for very different protocols.
 * • Demographics limited to ages 20–58.
 * • We map all 77 app exercises to the 7 studied exercises.  Exercises that
 *   are close analogues (e.g. incline bench → chest press) inherit the
 *   equation directly; distant mappings (e.g. hip thrust → leg press)
 *   carry additional uncertainty.
 * • Bodyweight exercises (pull-ups, dips, push-ups) add a fraction of
 *   body mass to the logged weight before computing TV.
 * • When height, age, or body composition are unknown, defaults are used
 *   (175 cm, 30 yr, 22 % body fat) which adds ~±10 kcal per workout
 *   to the uncertainty.
 */

// ── Individual exercise regression coefficients (Table 2) ──────────────

interface ExerciseCoeffs {
	h: number;   // height (cm)
	age: number; // age (yr)
	g: number;   // gender (male=1, female=0)
	fm: number;  // DEXA fat mass (kg)
	lm: number;  // DEXA lean mass (kg)
	w: number;   // exercise weight / 100
	v: number;   // exercise TV / 1000
	c: number;   // constant
	see: number; // standard error of estimate (kcal)
}

const LYTLE_EXERCISES: Record<string, ExerciseCoeffs> = {
	'leg-press': {
		h: 0.120, age: -0.093, g: 0, fm: 0, lm: 0.297,
		w: 1.169, v: 0, c: -13.837, see: 4.4
	},
	'chest-press': {
		h: 0.186, age: -0.317, g: -0.198, fm: 0, lm: 0.271,
		w: 4.211, v: 0, c: -28.468, see: 4.7
	},
	'leg-curl': {
		h: 0, age: -0.129, g: 0, fm: 0, lm: 0.245,
		w: 5.189, v: -0.100, c: 6.633, see: 5.36
	},
	'lat-pulldown': {
		h: 0, age: -0.165, g: 0, fm: -0.128, lm: 0.187,
		w: 4.725, v: 0, c: 8.483, see: 4.96
	},
	'leg-extension': {
		h: 0, age: -0.08, g: -1.635, fm: -0.185, lm: 0.394,
		w: 4.252, v: 0, c: 1.444, see: 5.31
	},
	'triceps-pushdown': {
		h: 0.255, age: 0, g: -5.124, fm: -0.239, lm: 0.390,
		w: 1.919, v: 0, c: -44.891, see: 4.99
	},
	'biceps-curl': {
		h: 0.292, age: -0.091, g: -7.068, fm: 0, lm: 0.351,
		w: 1.510, v: -0.156, c: -44.262, see: 5.60
	},
};

// ── Total bout equation coefficients ───────────────────────────────────

const TOTAL_BOUT = {
	h: 0.874,
	age: -0.596,
	fm: -1.016,
	lm: 1.638,
	tv: 2.461,   // applied to TV / 1000
	c: -110.742,
	see: 28.465,
	r2: 0.773,
};

// ── Exercise → Lytle category mapping ──────────────────────────────────
//
// confidence: 'direct' = very close analogue of the studied exercise
//             'close'  = same movement pattern / muscle group
//             'distant' = best available but mechanically different

type MappingConfidence = 'direct' | 'close' | 'distant';

interface ExerciseMapping {
	lytleKey: string;
	confidence: MappingConfidence;
	bwFraction?: number; // fraction of bodyweight to add (for bodyweight exercises)
}

export const EXERCISE_MAP: Record<string, ExerciseMapping> = {
	// === CHEST → chest-press ===
	'bench-press-barbell':            { lytleKey: 'chest-press', confidence: 'direct' },
	'incline-bench-press-barbell':    { lytleKey: 'chest-press', confidence: 'close' },
	'decline-bench-press-barbell':    { lytleKey: 'chest-press', confidence: 'close' },
	'bench-press-close-grip-barbell': { lytleKey: 'chest-press', confidence: 'close' },
	'bench-press-dumbbell':           { lytleKey: 'chest-press', confidence: 'close' },
	'incline-bench-press-dumbbell':   { lytleKey: 'chest-press', confidence: 'close' },
	'chest-fly-dumbbell':             { lytleKey: 'chest-press', confidence: 'distant' },
	'chest-dip':                      { lytleKey: 'chest-press', confidence: 'close', bwFraction: 0.90 },
	'push-up':                        { lytleKey: 'chest-press', confidence: 'close', bwFraction: 0.64 },
	'cable-crossover':                { lytleKey: 'chest-press', confidence: 'distant' },

	// === BACK → lat-pulldown ===
	'bent-over-row-barbell':  { lytleKey: 'lat-pulldown', confidence: 'close' },
	'deadlift-barbell':       { lytleKey: 'leg-press', confidence: 'distant' }, // full-body → leg-press as largest compound
	'pull-up':                { lytleKey: 'lat-pulldown', confidence: 'direct', bwFraction: 1.0 },
	'chin-up':                { lytleKey: 'lat-pulldown', confidence: 'direct', bwFraction: 1.0 },
	'lat-pulldown-cable':     { lytleKey: 'lat-pulldown', confidence: 'direct' },
	'seated-row-cable':       { lytleKey: 'lat-pulldown', confidence: 'close' },
	'dumbbell-row':           { lytleKey: 'lat-pulldown', confidence: 'close' },
	't-bar-row':              { lytleKey: 'lat-pulldown', confidence: 'close' },
	'incline-row-dumbbell':   { lytleKey: 'lat-pulldown', confidence: 'close' },
	'face-pull-cable':        { lytleKey: 'lat-pulldown', confidence: 'distant' },

	// === SHOULDERS → chest-press (pressing) or lat-pulldown (pulling) ===
	'overhead-press-barbell':  { lytleKey: 'chest-press', confidence: 'close' },
	'overhead-press-dumbbell': { lytleKey: 'chest-press', confidence: 'close' },
	'lateral-raise-dumbbell':  { lytleKey: 'biceps-curl', confidence: 'distant' }, // isolation, similar load range
	'lateral-raise-cable':     { lytleKey: 'biceps-curl', confidence: 'distant' },
	'front-raise-dumbbell':    { lytleKey: 'biceps-curl', confidence: 'distant' },
	'reverse-fly-dumbbell':    { lytleKey: 'biceps-curl', confidence: 'distant' },
	'upright-row-barbell':     { lytleKey: 'lat-pulldown', confidence: 'distant' },
	'shrug-barbell':           { lytleKey: 'lat-pulldown', confidence: 'distant' },
	'shrug-dumbbell':          { lytleKey: 'lat-pulldown', confidence: 'distant' },

	// === ARMS (biceps) → biceps-curl ===
	'bicep-curl-barbell':          { lytleKey: 'biceps-curl', confidence: 'direct' },
	'bicep-curl-dumbbell':         { lytleKey: 'biceps-curl', confidence: 'direct' },
	'hammer-curl-dumbbell':        { lytleKey: 'biceps-curl', confidence: 'close' },
	'preacher-curl-barbell':       { lytleKey: 'biceps-curl', confidence: 'close' },
	'concentration-curl-dumbbell': { lytleKey: 'biceps-curl', confidence: 'close' },
	'cable-curl':                  { lytleKey: 'biceps-curl', confidence: 'close' },

	// === ARMS (triceps) → triceps-pushdown ===
	'tricep-pushdown-cable':              { lytleKey: 'triceps-pushdown', confidence: 'direct' },
	'skullcrusher-dumbbell':              { lytleKey: 'triceps-pushdown', confidence: 'close' },
	'skullcrusher-barbell':               { lytleKey: 'triceps-pushdown', confidence: 'close' },
	'overhead-tricep-extension-dumbbell': { lytleKey: 'triceps-pushdown', confidence: 'close' },
	'tricep-dip':                         { lytleKey: 'triceps-pushdown', confidence: 'close', bwFraction: 0.90 },
	'kickback-dumbbell':                  { lytleKey: 'triceps-pushdown', confidence: 'close' },

	// === LEGS (quad-dominant) → leg-press or leg-extension ===
	'squat-barbell':                  { lytleKey: 'leg-press', confidence: 'close' },
	'front-squat-barbell':            { lytleKey: 'leg-press', confidence: 'close' },
	'leg-press-machine':              { lytleKey: 'leg-press', confidence: 'direct' },
	'lunge-dumbbell':                 { lytleKey: 'leg-press', confidence: 'close' },
	'bulgarian-split-squat-dumbbell': { lytleKey: 'leg-press', confidence: 'close' },
	'leg-extension-machine':          { lytleKey: 'leg-extension', confidence: 'direct' },
	'goblet-squat-dumbbell':          { lytleKey: 'leg-press', confidence: 'close' },
	'hack-squat-machine':             { lytleKey: 'leg-press', confidence: 'close' },

	// === LEGS (hamstring/posterior) → leg-curl ===
	'leg-curl-machine':            { lytleKey: 'leg-curl', confidence: 'direct' },
	'romanian-deadlift-barbell':   { lytleKey: 'leg-curl', confidence: 'close' },
	'romanian-deadlift-dumbbell':  { lytleKey: 'leg-curl', confidence: 'close' },
	'hip-thrust-barbell':          { lytleKey: 'leg-press', confidence: 'distant' },
	'nordic-hamstring-curl':       { lytleKey: 'leg-curl', confidence: 'close', bwFraction: 0.70 },

	// === LEGS (calves) → leg-extension (closest isolation) ===
	'calf-raise-machine':  { lytleKey: 'leg-extension', confidence: 'distant' },
	'calf-raise-standing': { lytleKey: 'leg-extension', confidence: 'distant' },

	// === CORE → biceps-curl (similar isolation load range) ===
	'plank':              { lytleKey: 'biceps-curl', confidence: 'distant' },
	'decline-crunch':     { lytleKey: 'biceps-curl', confidence: 'distant' },
	'flat-leg-raise':     { lytleKey: 'biceps-curl', confidence: 'distant' },
	'crunch':             { lytleKey: 'biceps-curl', confidence: 'distant' },
	'hanging-leg-raise':  { lytleKey: 'biceps-curl', confidence: 'distant' },
	'cable-crunch':       { lytleKey: 'biceps-curl', confidence: 'distant' },
	'russian-twist':      { lytleKey: 'biceps-curl', confidence: 'distant' },
	'ab-wheel-rollout':   { lytleKey: 'biceps-curl', confidence: 'distant', bwFraction: 0.50 },

	// === OTHER ===
	'clean-and-press-barbell': { lytleKey: 'leg-press', confidence: 'distant' },
	'farmers-walk':            { lytleKey: 'leg-press', confidence: 'distant' },
};

// ── Confidence penalty for uncertainty ──────────────────────────────────
// Additional SEE (kcal) added per exercise based on mapping confidence.
// 'direct' = same exercise, no additional error.
// 'close'  = same pattern, small extrapolation error.
// 'distant' = different pattern, larger extrapolation.
const CONFIDENCE_SEE: Record<MappingConfidence, number> = {
	direct: 0,
	close: 2,
	distant: 5,
};

// ── Demographics type ──────────────────────────────────────────────────

export interface Demographics {
	heightCm?: number;     // default: 175
	ageYr?: number;        // default: 30
	isMale?: boolean;      // default: true (gender=1)
	bodyWeightKg?: number; // default: 80
	bodyFatPct?: number;   // default: 22
}

const DEFAULTS: Required<Demographics> = {
	heightCm: 175,
	ageYr: 30,
	isMale: true,
	bodyWeightKg: 80,
	bodyFatPct: 22,
};

function resolveDemographics(d?: Demographics) {
	const heightCm = d?.heightCm ?? DEFAULTS.heightCm;
	const ageYr = d?.ageYr ?? DEFAULTS.ageYr;
	const isMale = d?.isMale ?? DEFAULTS.isMale;
	const bodyWeightKg = d?.bodyWeightKg ?? DEFAULTS.bodyWeightKg;
	const bodyFatPct = d?.bodyFatPct ?? DEFAULTS.bodyFatPct;
	const fatMassKg = bodyWeightKg * bodyFatPct / 100;
	const leanMassKg = bodyWeightKg - fatMassKg;
	const gender = isMale ? 1 : 0;

	// Track how many fields used defaults (for uncertainty)
	let defaultCount = 0;
	if (d?.heightCm == null) defaultCount++;
	if (d?.ageYr == null) defaultCount++;
	if (d?.bodyWeightKg == null) defaultCount++;
	if (d?.bodyFatPct == null) defaultCount++;

	return { heightCm, ageYr, gender, fatMassKg, leanMassKg, bodyWeightKg, defaultCount };
}

// ── Per-exercise set data ──────────────────────────────────────────────

export interface SetData {
	weight: number; // external load in kg (already ×2 for bilateral)
	reps: number;
}

export interface ExerciseData {
	exerciseId: string;
	sets: SetData[];
}

// ── Core estimation functions ──────────────────────────────────────────

/**
 * Compute effective weight for a set, adding bodyweight fraction where applicable.
 */
function effectiveWeight(exerciseId: string, externalWeight: number, bodyMassKg: number): number {
	const mapping = EXERCISE_MAP[exerciseId];
	if (mapping?.bwFraction) {
		return externalWeight + bodyMassKg * mapping.bwFraction;
	}
	return externalWeight;
}

/**
 * Estimate kcal for a single exercise using the individual Lytle equation.
 */
function estimateExerciseKcal(
	exerciseId: string,
	sets: SetData[],
	demo: ReturnType<typeof resolveDemographics>
): { kcal: number; see: number } {
	const mapping = EXERCISE_MAP[exerciseId];
	if (!mapping) return { kcal: 0, see: 0 };

	const coeffs = LYTLE_EXERCISES[mapping.lytleKey];
	if (!coeffs) return { kcal: 0, see: 0 };

	// Compute average exercise weight and total TV for this exercise
	let totalTV = 0;
	let totalWeightedWeight = 0;
	let totalReps = 0;
	for (const s of sets) {
		if (s.reps <= 0) continue;
		const w = effectiveWeight(exerciseId, s.weight, demo.bodyWeightKg);
		totalTV += w * s.reps;
		totalWeightedWeight += w * s.reps;
		totalReps += s.reps;
	}
	if (totalReps === 0) return { kcal: 0, see: 0 };

	const avgWeight = totalWeightedWeight / totalReps;

	const kcal = coeffs.h * demo.heightCm
		+ coeffs.age * demo.ageYr
		+ coeffs.g * demo.gender
		+ coeffs.fm * demo.fatMassKg
		+ coeffs.lm * demo.leanMassKg
		+ coeffs.w * (avgWeight / 100)
		+ coeffs.v * (totalTV / 1000)
		+ coeffs.c;

	const see = Math.sqrt(coeffs.see ** 2 + CONFIDENCE_SEE[mapping.confidence] ** 2);

	return { kcal: Math.max(0, kcal), see };
}

/**
 * Estimate kcal for an entire workout using the total bout equation.
 *
 * Returns point estimate and 95% confidence interval.
 */
export function estimateWorkoutKcal(
	exercises: ExerciseData[],
	demographics?: Demographics
): { kcal: number; lower: number; upper: number; see: number } {
	const demo = resolveDemographics(demographics);

	// Compute total TV across all exercises
	let totalTV = 0;
	for (const ex of exercises) {
		for (const s of ex.sets) {
			if (s.reps <= 0) continue;
			const w = effectiveWeight(ex.exerciseId, s.weight, demo.bodyWeightKg);
			totalTV += w * s.reps;
		}
	}

	const kcal = TOTAL_BOUT.h * demo.heightCm
		+ TOTAL_BOUT.age * demo.ageYr
		+ TOTAL_BOUT.fm * demo.fatMassKg
		+ TOTAL_BOUT.lm * demo.leanMassKg
		+ TOTAL_BOUT.tv * (totalTV / 1000)
		+ TOTAL_BOUT.c;

	// Uncertainty: model SEE + demographic default uncertainty
	// Each defaulted demographic adds ~3-4 kcal of uncertainty (height ±10cm = ±8.7,
	// age ±10yr = ±6.0, body comp ±5% = ±5-8 kcal; halved for ±1σ)
	const demoUncertainty = demo.defaultCount * 4;
	const see = Math.sqrt(TOTAL_BOUT.see ** 2 + demoUncertainty ** 2);

	const point = Math.max(0, kcal);
	return {
		kcal: Math.round(point),
		lower: Math.max(0, Math.round(point - 1.96 * see)),
		upper: Math.round(point + 1.96 * see),
		see: Math.round(see * 10) / 10,
	};
}

/**
 * Estimate kcal per exercise within a workout (using individual equations).
 * Useful for showing which exercises contributed most.
 */
export function estimatePerExerciseKcal(
	exercises: ExerciseData[],
	demographics?: Demographics
): { exerciseId: string; kcal: number; see: number; confidence: MappingConfidence }[] {
	const demo = resolveDemographics(demographics);

	return exercises.map((ex) => {
		const { kcal, see } = estimateExerciseKcal(ex.exerciseId, ex.sets, demo);
		const confidence = EXERCISE_MAP[ex.exerciseId]?.confidence ?? 'distant';
		return { exerciseId: ex.exerciseId, kcal: Math.round(kcal * 10) / 10, see: Math.round(see * 10) / 10, confidence };
	});
}

/**
 * Estimate cumulative kcal across multiple workouts.
 * Uncertainty decreases relative to the total as errors partially cancel.
 */
export function estimateCumulativeKcal(
	workoutResults: { kcal: number; see: number }[]
): { kcal: number; lower: number; upper: number } {
	let totalKcal = 0;
	let sumSeeSquared = 0;

	for (const w of workoutResults) {
		totalKcal += w.kcal;
		sumSeeSquared += w.see ** 2;
	}

	// Cumulative SEE = sqrt(sum of individual SEE²)
	// This assumes errors are independent across workouts
	const cumulativeSee = Math.sqrt(sumSeeSquared);

	return {
		kcal: Math.round(totalKcal),
		lower: Math.max(0, Math.round(totalKcal - 1.96 * cumulativeSee)),
		upper: Math.round(totalKcal + 1.96 * cumulativeSee),
	};
}

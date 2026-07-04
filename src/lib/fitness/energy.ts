/**
 * Basal-metabolic-rate and TDEE math — the single source of truth shared by the
 * nutrition stats endpoint and the nutrition page. Both surfaces must show the
 * same numbers, so the formula and the activity-multiplier table live here only.
 */

export type Sex = 'male' | 'female';

/**
 * NEAT-only activity multipliers. These are deliberately lower than standard
 * TDEE multipliers because tracked workout kcal are added separately, so folding
 * a full exercise multiplier in here would double-count them.
 */
export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
	sedentary: 1.2,
	light: 1.3,
	moderate: 1.4,
	very_active: 1.5
};

/** Multiplier used when the activity level is unset/unknown ('light'). */
export const DEFAULT_ACTIVITY_MULTIPLIER = 1.3;

/** Resolve an activity level to its multiplier, falling back to the default. */
export function activityMultiplier(activityLevel: string | null | undefined): number {
	return ACTIVITY_MULTIPLIERS[activityLevel ?? 'light'] ?? DEFAULT_ACTIVITY_MULTIPLIER;
}

/** Basal metabolic rate via Mifflin-St Jeor (doi:10.1093/ajcn/51.2.241). */
export function computeBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
	return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
}

/**
 * NEAT-only TDEE = BMR × activity multiplier. Tracked workout kcal are added by
 * the caller on top of this, hence the NEAT-only multipliers above.
 */
export function computeTdee(
	weightKg: number,
	heightCm: number,
	age: number,
	sex: Sex,
	activityLevel: string | null | undefined
): number {
	return computeBmr(weightKg, heightCm, age, sex) * activityMultiplier(activityLevel);
}

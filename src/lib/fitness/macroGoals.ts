/**
 * The day's macro targets in grams, from the stored goal.
 *
 * Extracted from the nutrition page so the server can compute the same numbers: the
 * "Finish your day" nudges are built from what is *left* of these targets, and they
 * are now rendered server-side. Two copies of this arithmetic would drift, and a
 * drifted copy shows up as suggestions that contradict the rings above them.
 *
 * Protein comes first and is the one target that does not move with exercise: it is
 * set from body weight (or fixed grams), so a workout cannot raise it. Whatever
 * calories remain after protein are split between fat and carbs by their stored
 * ratio — which is why extra exercise calories flow into those two.
 */

import { MACRO_KCAL } from './nutritionMath';

export type MacroGoalInput = {
	/** The day's calorie allowance *including* exercise burn, or null if unset. */
	calorieGoal: number | null | undefined;
	proteinMode?: 'fixed' | 'per_kg' | null;
	proteinTarget?: number | null;
	/** Body weight for a per-kg protein goal; ignored by a fixed one. */
	weightKg?: number | null;
	fatPercent?: number | null;
	carbPercent?: number | null;
};

export type MacroGoalGrams = {
	protein: number | null;
	fat: number | null;
	carbs: number | null;
};

/** Grams of each macro the day is aiming at; null where the goal doesn't say. */
export function macroGoalGrams(input: MacroGoalInput): MacroGoalGrams {
	const { calorieGoal, proteinMode, proteinTarget, weightKg, fatPercent, carbPercent } = input;
	const kcal = calorieGoal || null;

	const protein = ((): number | null => {
		if (proteinTarget) {
			if (proteinMode === 'per_kg' && weightKg) return proteinTarget * weightKg;
			if (proteinMode === 'fixed') return proteinTarget;
		}
		// No protein target of its own: take what the fat/carb percentages leave over.
		if (kcal && fatPercent != null && carbPercent != null) {
			const proteinPct = 100 - (fatPercent || 0) - (carbPercent || 0);
			if (proteinPct > 0) return (kcal * proteinPct / 100) / MACRO_KCAL.protein;
		}
		return null;
	})();

	/** Fat or carb grams: its share of what protein leaves, else a flat percentage. */
	const rest = (percent: number | null | undefined, perGram: number): number | null => {
		if (!kcal) return null;
		if (protein != null && fatPercent != null && carbPercent != null) {
			const remainingCal = Math.max(0, kcal - protein * MACRO_KCAL.protein);
			const ratioSum = (fatPercent || 0) + (carbPercent || 0);
			if (ratioSum > 0) return (remainingCal * (percent || 0) / ratioSum) / perGram;
		}
		return percent ? (kcal * percent / 100) / perGram : null;
	};

	return {
		protein,
		fat: rest(fatPercent, MACRO_KCAL.fat),
		carbs: rest(carbPercent, MACRO_KCAL.carbs),
	};
}

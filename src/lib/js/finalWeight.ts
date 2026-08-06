/**
 * What the finished dish weighs.
 *
 * Every weight in the nutrition pipeline is derived by summing the ingredient
 * lines, which measures the dish *before* it is cooked. Bread loses water in the
 * oven, a sauce reduces, pasta is drained — the plate weighs less than what went
 * into the bowl, and the nutrients are all still there. Dividing them by the raw
 * sum therefore understates every per-100 g figure, and logging "100 g of this"
 * pulls in too little of each ingredient.
 *
 * The nutrients never change here. Only the denominator does.
 */

export type FinalWeightMode = 'auto' | 'relative' | 'absolute';

export type FinalWeightOverride = {
	mode?: FinalWeightMode;
	/** `relative`: signed percent against the ingredient sum. -10 means "10% less". */
	percent?: number | null;
	/** `absolute`: what the finished dish weighs, in grams. */
	grams?: number | null;
};

/**
 * Resolve the finished weight from the ingredient sum and the recipe's override.
 *
 * Falls back to `sumGrams` for anything unusable — no override, an empty field, a
 * percent that would drive the weight to zero or below. A recipe is never left
 * with a zero denominator because someone typed the wrong thing into a form.
 */
export function resolveFinalWeight(
	sumGrams: number,
	override?: FinalWeightOverride | null
): number {
	if (!override || !override.mode || override.mode === 'auto') return sumGrams;

	if (override.mode === 'absolute') {
		const grams = Number(override.grams);
		return Number.isFinite(grams) && grams > 0 ? grams : sumGrams;
	}

	const percent = Number(override.percent);
	if (!Number.isFinite(percent)) return sumGrams;
	const scaled = sumGrams * (1 + percent / 100);
	return scaled > 0 ? scaled : sumGrams;
}

/** True when the override actually changes anything, i.e. it is worth persisting. */
export function hasFinalWeightOverride(override?: FinalWeightOverride | null): boolean {
	if (!override || !override.mode || override.mode === 'auto') return false;
	if (override.mode === 'absolute') {
		const grams = Number(override.grams);
		return Number.isFinite(grams) && grams > 0;
	}
	const percent = Number(override.percent);
	return Number.isFinite(percent) && percent !== 0;
}

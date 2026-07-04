/**
 * Estimated one-rep max via the Epley formula, rounded to the nearest whole unit.
 *
 * Single source of truth for est-1RM across the fitness app. The API (PR
 * detection, exercise stats) and every client table/chart must agree on the
 * same value, so the formula and its rounding policy live here — never inline
 * at a call site. Returns 0 for a non-positive weight or rep count.
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
	if (reps <= 0 || weight <= 0) return 0;
	if (reps === 1) return weight;
	return Math.round(weight * (1 + reps / 30));
}

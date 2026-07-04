/**
 * Meal-type vocabulary — the single source of truth previously copy-pasted as
 * `['breakfast','lunch','dinner','snack']` across the nutrition page, the food
 * detail page and MealTypePicker, plus a `defaultMealType()` duplicated verbatim.
 */

/** Ordered meal buckets a food-log entry can belong to. */
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

/** Meal values the food-log API accepts (adds the `water` pseudo-meal). */
export const LOGGABLE_MEALS = [...MEAL_TYPES, 'water'] as const;

/** Best-guess meal type for a time of day (defaults to now). */
export function defaultMealType(now: Date = new Date()): MealType {
	const h = now.getHours();
	if (h >= 5 && h < 10) return 'breakfast';
	if (h >= 10 && h < 15) return 'lunch';
	if (h >= 15 && h < 17) return 'snack';
	return 'dinner';
}

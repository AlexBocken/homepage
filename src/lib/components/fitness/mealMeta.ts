/**
 * How a meal type looks: its icon and its colour.
 *
 * Split out of `$lib/fitness/meals` rather than added to it, because that module is
 * imported by the food-log endpoint and would drag the icon library into the server
 * bundle for the sake of four glyphs.
 *
 * The colours run through the day — sunrise yellow, midday orange, evening purple —
 * with snack sitting outside the arc in green. Every surface that names a meal reads
 * from here, so the picker in the recipe dialog, the quick-log sidebar and the diary
 * headers cannot drift apart; they were three separate copies of this table before.
 */
import Coffee from '@lucide/svelte/icons/coffee';
import Sun from '@lucide/svelte/icons/sun';
import Moon from '@lucide/svelte/icons/moon';
import Cookie from '@lucide/svelte/icons/cookie';
import type { MealType } from '$lib/fitness/meals';

export type MealVisual = { icon: typeof Coffee; color: string };

export const MEAL_META: Record<MealType, MealVisual> = {
	breakfast: { icon: Coffee, color: 'var(--yellow)' },
	lunch: { icon: Sun, color: 'var(--orange)' },
	dinner: { icon: Moon, color: 'var(--purple)' },
	snack: { icon: Cookie, color: 'var(--green)' },
};

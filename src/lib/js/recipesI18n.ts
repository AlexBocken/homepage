/**
 * Recipes route i18n.
 *
 * Translation tables live per-locale in `$lib/i18n/recipes/{de,en}.ts`.
 * `de.ts` is the source of truth for the key set; `en.ts` uses
 * `satisfies Record<keyof typeof de, string>` so missing translations
 * fail the build.
 *
 * Recipes routes get `lang` from the layout server load (data.lang),
 * derived from the [recipeLang=recipeLang] param matcher: rezepte→de,
 * recipes→en. Use `langFromRecipeSlug(params.recipeLang)` if you need it
 * from the slug directly.
 */

import { de } from '$lib/i18n/recipes/de';
import { en } from '$lib/i18n/recipes/en';
import { makeT } from '$lib/js/commonI18n';
import { SLUGS, slugFor } from '$lib/js/slugs';

export const m = { de, en } as const;

export type RecipesLang = keyof typeof m;
export type RecipesKey = keyof typeof de;

/** Map a `[recipeLang]` slug to the locale code. */
export function langFromRecipeSlug(recipeLang: string | null | undefined): RecipesLang {
	return recipeLang === SLUGS.recipes.en ? 'en' : 'de';
}

/** Reverse: locale → URL slug. */
export const recipeSlugFromLang = slugFor(SLUGS.recipes);

/**
 * Get a translated string. Prefer `m[lang].key` directly in new code —
 * this helper is kept for incremental migration.
 */
export const t = makeT<RecipesKey, RecipesLang>(m);

/**
 * Finances route i18n helpers.
 *
 * Translation tables live per-locale in `$lib/i18n/finances/{de,en}.ts`.
 * `de.ts` is the source of truth for the key set; `en.ts` uses
 * `satisfies Record<keyof typeof de, string>` so a missing English translation
 * surfaces as a TypeScript error at build time.
 *
 * The finances section keeps URLs language-agnostic (English slugs). The active
 * language is the site-wide client preference (`languageStore`, seeded from
 * localStorage by `LanguageSelector`). Components read it reactively:
 *
 *     import { languageStore } from '$lib/stores/language.svelte';
 *     import { m } from '$lib/js/financesI18n';
 *     const lang = $derived(financesLang(languageStore.value));
 *     const t = $derived(m[lang]);
 */

import { de } from '$lib/i18n/finances/de';
import { en } from '$lib/i18n/finances/en';

/** All finances translations, keyed by locale. */
export const m = { de, en } as const;

export type FinancesLang = keyof typeof m;
export type FinancesKey = keyof typeof de;

/** Narrow the site-wide language (which may include 'la') to the two locales
 *  the finances section supports; anything unknown falls back to German. */
export function financesLang(lang: string | undefined): FinancesLang {
	return lang === 'en' ? 'en' : 'de';
}

/** Short month names for chart axes / month labels, keyed by locale. Index 0 =
 *  January. Kept here (not in the string tables) since it's a positional array. */
export const MONTHS_SHORT: Record<FinancesLang, string[]> = {
	de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
	en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

/** Label a `YYYY-MM` month key in the given locale, e.g. "Mär 2026". */
export function monthLabel(mk: string, lang: FinancesLang): string {
	return `${MONTHS_SHORT[lang][Number(mk.slice(5, 7)) - 1]} ${mk.slice(0, 4)}`;
}

/** Get a translated string with an English → key fallback. Prefer `m[lang].key`
 *  directly; this exists for the odd dynamic-key call site. */
export function t(key: FinancesKey, lang: FinancesLang): string {
	return m[lang][key] ?? m.en[key] ?? key;
}

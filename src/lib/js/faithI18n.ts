/**
 * Faith route i18n — UI translations and slug mappings.
 *
 * Translation tables live per-locale in `$lib/i18n/faith/{de,en,la}.ts`.
 * `de.ts` is the source of truth for the key set; `en.ts` and `la.ts` use
 * `satisfies Record<keyof typeof de, string>` so any missing translation
 * surfaces as a TypeScript error at build time.
 *
 * Faith routes get `lang` from layout server data (data.lang), derived from
 * the [faithLang=faithLang] param matcher: glaube→de, faith→en, fides→la.
 * Use `langFromFaithSlug(params.faithLang)` if you need it from the slug
 * directly.
 */

import { de } from '$lib/i18n/faith/de';
import { en } from '$lib/i18n/faith/en';
import { la } from '$lib/i18n/faith/la';

/** All faith translations, keyed by locale. */
export const m = { de, en, la } as const;

export type FaithLang = keyof typeof m;
export type FaithKey = keyof typeof de;

/** Map a `[faithLang]` slug to the locale code. */
export function langFromFaithSlug(faithLang: string | null | undefined): FaithLang {
	if (faithLang === 'faith') return 'en';
	if (faithLang === 'fides') return 'la';
	return 'de';
}

/** Reverse: locale → URL slug. */
export function faithSlugFromLang(lang: FaithLang): 'faith' | 'glaube' | 'fides' {
	if (lang === 'en') return 'faith';
	if (lang === 'la') return 'fides';
	return 'glaube';
}

/** URL slug for the `[prayers=prayersLang]` segment per locale. */
export function prayersSlug(lang: FaithLang): 'prayers' | 'gebete' | 'orationes' {
	if (lang === 'en') return 'prayers';
	if (lang === 'la') return 'orationes';
	return 'gebete';
}

/** URL slug for the `[rosary=rosaryLang]` segment per locale. */
export function rosarySlug(lang: FaithLang): 'rosary' | 'rosenkranz' | 'rosarium' {
	if (lang === 'en') return 'rosary';
	if (lang === 'la') return 'rosarium';
	return 'rosenkranz';
}

/** URL slug for the `[calendar=calendarLang]` segment per locale. */
export function calendarSlug(lang: FaithLang): 'calendar' | 'kalender' | 'calendarium' {
	if (lang === 'en') return 'calendar';
	if (lang === 'la') return 'calendarium';
	return 'kalender';
}

/** URL slug for the apologetik section per locale (no Latin variant — falls back to English). */
export function apologetikSlug(lang: FaithLang): 'apologetics' | 'apologetik' {
	return lang === 'de' ? 'apologetik' : 'apologetics';
}

/**
 * Get a translated string. Prefer `m[lang].key` directly in new code — this
 * helper is kept for incremental migration and falls back to English then
 * the key itself if the lookup misses.
 */
export function t(key: FaithKey, lang: FaithLang): string {
	return m[lang][key] ?? m.en[key] ?? key;
}

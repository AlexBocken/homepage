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

/** URL slug for the `[bible=bibleLang]` segment per locale. */
export function bibleSlug(lang: FaithLang): 'bible' | 'bibel' | 'biblia' {
	if (lang === 'en') return 'bible';
	if (lang === 'la') return 'biblia';
	return 'bibel';
}

/** URL slug for the `[katechese=katecheseLang]` segment per locale. */
export function katecheseSlug(lang: FaithLang): 'katechese' | 'catechesis' {
	// Latin says it as English does — catechesis is the Greek word both borrowed.
	return lang === 'de' ? 'katechese' : 'catechesis';
}

/**
 * URL slug for the `[catechism=catechismLang]` segment per locale: the
 * abbreviation each language cites the Catechism by.
 */
export function catechismSlug(lang: FaithLang): 'ccc' | 'kkk' | 'cce' {
	if (lang === 'en') return 'ccc';
	if (lang === 'la') return 'cce';
	return 'kkk';
}

/** URL slug for the `[council=councilLang]` segment per locale. */
export function councilSlug(lang: FaithLang): 'council' | 'konzil' | 'concilium' {
	if (lang === 'en') return 'council';
	if (lang === 'la') return 'concilium';
	return 'konzil';
}

/** URL slug for the `[canon=canonLang]` segment per locale. */
export function canonSlug(lang: FaithLang): 'canon-law' | 'kirchenrecht' | 'ius-canonicum' {
	if (lang === 'en') return 'canon-law';
	if (lang === 'la') return 'ius-canonicum';
	return 'kirchenrecht';
}

/**
 * URL slug for the `[magisterium=magisteriumLang]` segment per locale. German
 * has no one word covering an encyclical, a constitution and a CDF
 * instruction at once except "Lehrschreiben"; English and Latin share
 * "magisterium".
 */
export function magisteriumSlug(lang: FaithLang): 'magisterium' | 'lehrschreiben' {
	return lang === 'de' ? 'lehrschreiben' : 'magisterium';
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

/* ---------------- swapping a path from one language to another ---------------- */

/** The three faith sections, by the slug that opens the path. */
export const FAITH_BASES = ['glaube', 'faith', 'fides'] as const;

/**
 * Every container slug the faith routes use, by family. What is inside a
 * container — a prayer's name, a Bible book, a Catechism paragraph, a glossary
 * term — is the page's own and is never translated here.
 */
const CONTAINERS: { slugs: readonly string[]; of: (lang: FaithLang) => string }[] = [
	{ slugs: ['gebete', 'prayers', 'orationes'], of: prayersSlug },
	{ slugs: ['rosenkranz', 'rosary', 'rosarium'], of: rosarySlug },
	{ slugs: ['kalender', 'calendar', 'calendarium'], of: calendarSlug },
	{ slugs: ['bibel', 'bible', 'biblia'], of: bibleSlug },
	{ slugs: ['katechese', 'catechesis'], of: katecheseSlug },
	{ slugs: ['kkk', 'ccc', 'cce'], of: catechismSlug },
	{ slugs: ['konzil', 'council', 'concilium'], of: councilSlug },
	{ slugs: ['kirchenrecht', 'canon-law', 'ius-canonicum'], of: canonSlug },
	{ slugs: ['lehrschreiben', 'magisterium'], of: magisteriumSlug },
	{ slugs: ['apologetik', 'apologetics'], of: apologetikSlug }
];

/** The same container in another language, or the segment unchanged. */
export const translateFaithSegment = (segment: string, lang: FaithLang): string => CONTAINERS.find((family) => family.slugs.includes(segment))?.of(lang) ?? segment;

/** Whether this segment opens the catechesis section, which nests a container. */
export const isKatecheseSlug = (segment: string): boolean => segment === 'katechese' || segment === 'catechesis';

/**
 * A faith path as the same page reads in `target`: the language segment and the
 * container slugs are swapped, everything else is left where it is. The
 * catechesis is the one section that nests a container of its own — the
 * Catechism — so its second segment is swapped too.
 *
 * A path that is not a faith path comes back unchanged.
 */
export function convertFaithPath(path: string, target: FaithLang): string {
	const segments = path.split('/').filter(Boolean);
	if (!FAITH_BASES.includes(segments[0] as (typeof FAITH_BASES)[number])) return path;
	segments[0] = faithSlugFromLang(target);
	if (segments.length > 1) segments[1] = translateFaithSegment(segments[1], target);
	if (segments.length > 2 && isKatecheseSlug(segments[1])) segments[2] = translateFaithSegment(segments[2], target);
	return `/${segments.join('/')}`;
}

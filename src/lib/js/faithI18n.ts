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
import { SLUGS, langOfSlug, slugFor, slugMatcher } from '$lib/js/slugs';

/** All faith translations, keyed by locale. */
export const m = { de, en, la } as const;

export type FaithLang = keyof typeof m;
export type FaithKey = keyof typeof de;

/** Map a `[faithLang]` slug to the locale code. */
export function langFromFaithSlug(faithLang: string | null | undefined): FaithLang {
	return langOfSlug(SLUGS.faith, faithLang) ?? 'de';
}

/** Reverse: locale → URL slug. */
export const faithSlugFromLang = slugFor(SLUGS.faith);

/** URL slug for the `[prayers=prayersLang]` segment per locale. */
export const prayersSlug = slugFor(SLUGS.prayers);

/** URL slug for the `[rosary=rosaryLang]` segment per locale. */
export const rosarySlug = slugFor(SLUGS.rosary);

/** URL slug for the `[calendar=calendarLang]` segment per locale. */
export const calendarSlug = slugFor(SLUGS.calendar);

/** URL slug for the `[bible=bibleLang]` segment per locale. */
export const bibleSlug = slugFor(SLUGS.bible);

/**
 * URL slug for the `[katechese=katecheseLang]` segment per locale. Latin says
 * it as English does — catechesis is the Greek word both borrowed.
 */
export const katecheseSlug = slugFor(SLUGS.katechese);

/**
 * URL slug for the `[catechism=catechismLang]` segment per locale: the
 * abbreviation each language cites the Catechism by.
 */
export const catechismSlug = slugFor(SLUGS.catechism);

/** URL slug for the `[council=councilLang]` segment per locale. */
export const councilSlug = slugFor(SLUGS.council);

/** URL slug for the `[canon=canonLang]` segment per locale. */
export const canonSlug = slugFor(SLUGS.canon);

/**
 * URL slug for the `[magisterium=magisteriumLang]` segment per locale. German
 * has no one word covering an encyclical, a constitution and a CDF
 * instruction at once except "Lehrschreiben"; English and Latin share
 * "magisterium".
 */
export const magisteriumSlug = slugFor(SLUGS.magisterium);

/** URL slug for the apologetik section per locale (no Latin variant — falls back to English). */
export const apologetikSlug = slugFor(SLUGS.apologetik);

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
export const FAITH_BASES = [SLUGS.faith.de, SLUGS.faith.en, SLUGS.faith.la] as const;

/**
 * Every container slug the faith routes use, by family. What is inside a
 * container — a prayer's name, a Bible book, a Catechism paragraph, a glossary
 * term — is the page's own and is never translated here.
 */
const CONTAINERS = [
	SLUGS.prayers, SLUGS.rosary, SLUGS.calendar, SLUGS.bible, SLUGS.katechese,
	SLUGS.catechism, SLUGS.council, SLUGS.canon, SLUGS.magisterium, SLUGS.apologetik
].map((set) => ({ slugs: Object.values(set) as string[], of: slugFor(set) }));

/** The same container in another language, or the segment unchanged. */
export const translateFaithSegment = (segment: string, lang: FaithLang): string => CONTAINERS.find((family) => family.slugs.includes(segment))?.of(lang) ?? segment;

/** Whether this segment opens the catechesis section, which nests a container. */
export const isKatecheseSlug: (segment: string) => boolean = slugMatcher(SLUGS.katechese);

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

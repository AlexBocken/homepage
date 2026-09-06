/**
 * Hikes section i18n — slug mapping, UI strings and the small helpers the
 * hike components share.
 *
 * Per-locale tables live in `$lib/i18n/hikes/{de,en}.ts`. Use `m[lang].key`
 * directly:
 *
 *   import { m } from '$lib/js/hikesI18n';
 *   const t = $derived(m[lang]);
 *   ... t.distance ...
 *
 * The URL carries the language: `/wanderungen/…` is German, `/hikes/…` is
 * English. Both are one route tree behind the `hikesLang` param matcher.
 */
import { de } from '$lib/i18n/hikes/de';
import { en } from '$lib/i18n/hikes/en';
import type { HikeManifestEntry } from '$types/hikes';

export { tagLabel } from '$lib/i18n/hikes/tags';

export const m = { de, en } as const;

export type HikesLang = keyof typeof m;
export type HikesKey = keyof typeof de;

/** `'hikes'` is English, everything else (`'wanderungen'`, missing) German. */
export function langFromHikesSlug(slug?: string | null): HikesLang {
	return slug === 'hikes' ? 'en' : 'de';
}

export function hikesSlugFromLang(lang: HikesLang): 'hikes' | 'wanderungen' {
	return lang === 'en' ? 'hikes' : 'wanderungen';
}

/** True for any path inside the hikes section, in either language. */
export function isHikesPath(pathname: string): boolean {
	return /^\/(hikes|wanderungen)(\/|$)/.test(pathname);
}

/** Swap only the first segment; the slug and any query string stay as they are. */
export function convertHikesPath(pathname: string, target: HikesLang): string {
	return pathname.replace(/^\/(hikes|wanderungen)(?=\/|$)/, `/${hikesSlugFromLang(target)}`);
}

/** BCP 47 tag for number and date formatting. Swiss conventions in both. */
export function hikesLocale(lang: HikesLang): 'de-CH' | 'en-CH' {
	return lang === 'en' ? 'en-CH' : 'de-CH';
}

/** Language tag of the prose itself, for `inLanguage` and the like: the
 * German is Swiss, the English (DeepL EN-GB, hand-edited) British. */
export function contentLang(lang: HikesLang): 'de-CH' | 'en-GB' {
	return lang === 'en' ? 'en-GB' : 'de-CH';
}

/** Open Graph locale for the same two variants. */
export function ogLocale(lang: HikesLang): 'de_CH' | 'en_GB' {
	return lang === 'en' ? 'en_GB' : 'de_CH';
}

export const SITE = 'https://bocken.org';

export const MONTHS_SHORT: Record<HikesLang, readonly string[]> = {
	de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
	en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

/** Fill `{name}` placeholders in a message. Unknown names are left in place. */
export function fmt(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
		key in vars ? String(vars[key]) : whole
	);
}

/** Title and summary in the requested language, German when no English exists. */
export function hikeText(
	hike: Pick<HikeManifestEntry, 'title' | 'summary' | 'titleEn' | 'summaryEn'>,
	lang: HikesLang
): { title: string; summary: string } {
	if (lang === 'en') {
		return { title: hike.titleEn || hike.title, summary: hike.summaryEn || hike.summary };
	}
	return { title: hike.title, summary: hike.summary };
}

/** Alt text in the requested language, German when no English exists. */
export function altFor(v: { alt: string; altEn?: string }, lang: HikesLang): string {
	return lang === 'en' ? v.altEn || v.alt : v.alt;
}

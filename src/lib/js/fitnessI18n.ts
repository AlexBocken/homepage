/**
 * Fitness route i18n — slug mappings and UI translations.
 *
 * Translation tables live per-locale in `$lib/i18n/fitness/{de,en}.ts`.
 * `de.ts` is the source of truth for the key set; `en.ts` uses
 * `satisfies Record<keyof typeof de, string>` so any missing English
 * translation surfaces as a TypeScript error at build time.
 */

import { de } from '$lib/i18n/fitness/de';
import { en } from '$lib/i18n/fitness/en';

/** All fitness translations, keyed by locale. */
export const m = { de, en } as const;

export type FitnessLang = keyof typeof m;
export type FitnessKey = keyof typeof de;

const slugMap: Record<string, Record<string, string>> = {
	en: { statistik: 'stats', verlauf: 'history', training: 'workout', aktiv: 'active', uebungen: 'exercises', erfassung: 'check-in', ernaehrung: 'nutrition' },
	de: { stats: 'statistik', history: 'verlauf', workout: 'training', active: 'aktiv', exercises: 'uebungen', 'check-in': 'erfassung', nutrition: 'ernaehrung' }
};

const germanSlugs = new Set(Object.keys(slugMap.en));

/** Detect language from a fitness path by checking for any German slug */
export function detectFitnessLang(pathname: string): FitnessLang {
	const segments = pathname.replace(/^\/fitness\/?/, '').split('/');
	for (const seg of segments) {
		if (germanSlugs.has(seg)) return 'de';
	}
	return 'en';
}

/** Convert a fitness path to the target language */
export function convertFitnessPath(pathname: string, targetLang: FitnessLang): string {
	const map = slugMap[targetLang];
	const segments = pathname.split('/');
	return segments.map(seg => map[seg] ?? seg).join('/');
}

/** Get translated sub-route slugs for a given language */
export function fitnessSlugs(lang: FitnessLang) {
	return {
		stats: lang === 'en' ? 'stats' : 'statistik',
		history: lang === 'en' ? 'history' : 'verlauf',
		workout: lang === 'en' ? 'workout' : 'training',
		active: lang === 'en' ? 'active' : 'aktiv',
		exercises: lang === 'en' ? 'exercises' : 'uebungen',
		measure: lang === 'en' ? 'check-in' : 'erfassung',
		nutrition: lang === 'en' ? 'nutrition' : 'ernaehrung'
	};
}

/** Get translated nav labels */
export function fitnessLabels(lang: FitnessLang) {
	return {
		stats: lang === 'en' ? 'Stats' : 'Statistik',
		history: lang === 'en' ? 'History' : 'Verlauf',
		workout: lang === 'en' ? 'Workout' : 'Training',
		exercises: lang === 'en' ? 'Exercises' : 'Übungen',
		measure: lang === 'en' ? 'Check-in' : 'Erfassung',
		nutrition: lang === 'en' ? 'Nutrition' : 'Ernährung'
	};
}

/**
 * Get a translated string. Prefer `m[lang].key` directly in new code — this
 * helper is kept for the existing call sites and falls back to English then
 * the key itself if the lookup misses.
 */
export function t(key: FitnessKey, lang: FitnessLang): string {
	return m[lang][key] ?? m.en[key] ?? key;
}

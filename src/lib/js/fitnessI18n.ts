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
import { SLUGS } from '$lib/js/slugs';

/** All fitness translations, keyed by locale. */
export const m = { de, en } as const;

export type FitnessLang = keyof typeof m;
export type FitnessKey = keyof typeof de;

/** Insight keys that have a third-person `_her` counterpart. */
export type InsightKey = FitnessKey extends infer K
	? K extends `${infer B}_her`
		? B
		: never
	: never;

/**
 * Cycle-insight copy, phrased for whoever the cycle belongs to.
 *
 * With no `name` the reader owns the tracker, so the second-person base string
 * is used as-is. With a `name` the reader is viewing someone else's shared
 * tracker: the `_her` variant switches to third person and `{name}` is filled
 * in. Both variants are authored per key rather than derived, because German
 * inflects the possessive (Dein/Deine/{name}s) differently per sentence.
 */
export function insightText(lang: FitnessLang, key: InsightKey, name = ''): string {
	if (!name) return m[lang][key];
	return m[lang][`${key}_her` as FitnessKey].replaceAll('{name}', name);
}

/** The fitness sub-route slugs, keyed as `fitnessSlugs()` returns them. */
const SUBROUTES = {
	stats: SLUGS.fitnessStats,
	history: SLUGS.fitnessHistory,
	workout: SLUGS.fitnessWorkout,
	active: SLUGS.fitnessActive,
	exercises: SLUGS.fitnessExercises,
	measure: SLUGS.fitnessCheckIn,
	nutrition: SLUGS.fitnessNutrition,
	segments: SLUGS.fitnessSegments
} as const;

/** Segment → the same segment in the target language, for every sub-route. */
const slugMap: Record<string, Record<string, string>> = {
	en: Object.fromEntries(Object.values(SUBROUTES).map((s) => [s.de, s.en])),
	de: Object.fromEntries(Object.values(SUBROUTES).map((s) => [s.en, s.de]))
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
	const l = lang === 'en' ? 'en' : 'de';
	return {
		stats: SUBROUTES.stats[l],
		history: SUBROUTES.history[l],
		workout: SUBROUTES.workout[l],
		active: SUBROUTES.active[l],
		exercises: SUBROUTES.exercises[l],
		measure: SUBROUTES.measure[l],
		nutrition: SUBROUTES.nutrition[l],
		segments: SUBROUTES.segments[l]
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
		nutrition: lang === 'en' ? 'Nutrition' : 'Ernährung',
		segments: lang === 'en' ? 'Segments' : 'Segmente'
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

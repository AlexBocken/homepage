import { SLUGS } from '$lib/js/slugs';

// Canonical list of fitness-section shells to pre-cache for offline use.
// Both German and English slug variants are included so either language works
// offline. Shared by the fitness layout (caches on mount / reconnect) and the
// deliberate "download for offline" sync in sync.ts.
function shellsIn(lang: 'en' | 'de'): string[] {
	const workout = SLUGS.fitnessWorkout[lang];
	const checkIn = SLUGS.fitnessCheckIn[lang];
	const nutrition = SLUGS.fitnessNutrition[lang];
	return [
		workout, `${workout}/${SLUGS.fitnessActive[lang]}`,
		SLUGS.fitnessExercises[lang], SLUGS.fitnessStats[lang], SLUGS.fitnessHistory[lang],
		checkIn, nutrition, `${nutrition}/meals`, `${checkIn}/body-parts`
	];
}

// English and German side by side, each shell next to its translation.
const german = shellsIn('de');
const FITNESS_SLUGS = shellsIn('en').flatMap((s, i) => [s, german[i]]);

/** HTML shell URLs for all fitness pages (hard-navigation / direct entry). */
export const fitnessShellPages: string[] = [
	'/fitness',
	...FITNESS_SLUGS.map((s) => `/fitness/${s}`)
];

/** __data.json URLs needed for client-side navigation into fitness pages. */
export const fitnessShellData: string[] = [
	'/fitness/__data.json',
	...FITNESS_SLUGS.map((s) => `/fitness/${s}/__data.json`)
];

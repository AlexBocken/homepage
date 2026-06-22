// Canonical list of fitness-section shells to pre-cache for offline use.
// Both German and English slug variants are included so either language works
// offline. Shared by the fitness layout (caches on mount / reconnect) and the
// deliberate "download for offline" sync in sync.ts.
const FITNESS_SLUGS = [
	'workout', 'training', 'workout/active', 'training/aktiv',
	'exercises', 'uebungen', 'stats', 'statistik',
	'history', 'verlauf', 'check-in', 'erfassung',
	'nutrition', 'ernaehrung',
	'nutrition/meals', 'ernaehrung/meals',
	'check-in/body-parts', 'erfassung/body-parts'
];

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

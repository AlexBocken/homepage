/**
 * Every language slug the routes use, in one place.
 *
 * Each entry is one URL segment spelled per locale. The param matchers in
 * `src/params/` accept exactly an entry's values, and the i18n helpers
 * (`faithI18n`, `fitnessI18n`, `recipesI18n`, `hikesI18n`), the offline shell
 * lists and the service worker read their slugs from here, so a slug added or
 * renamed in this table reaches all of them at once.
 *
 * Entries are keyed after their matcher (`prayers` → `prayersLang`,
 * `fitnessStats` → `fitnessStats`). Kept free of imports so the service worker
 * and the param matchers can pull it in without dragging translation tables
 * along.
 */
export const SLUGS = {
	/* faith — German, English, Latin. Where Latin has no word of its own it
	 * borrows the English one. */
	faith: { de: 'glaube', en: 'faith', la: 'fides' },
	prayers: { de: 'gebete', en: 'prayers', la: 'orationes' },
	rosary: { de: 'rosenkranz', en: 'rosary', la: 'rosarium' },
	calendar: { de: 'kalender', en: 'calendar', la: 'calendarium' },
	bible: { de: 'bibel', en: 'bible', la: 'biblia' },
	katechese: { de: 'katechese', en: 'catechesis', la: 'catechesis' },
	/** The abbreviation each language cites the Catechism by. */
	catechism: { de: 'kkk', en: 'ccc', la: 'cce' },
	/** Where the Catechism used to live; these redirect to `catechism`. */
	catechismLegacy: { de: 'katechismus', en: 'catechism', la: 'catechismus' },
	council: { de: 'konzil', en: 'council', la: 'concilium' },
	canon: { de: 'kirchenrecht', en: 'canon-law', la: 'ius-canonicum' },
	magisterium: { de: 'lehrschreiben', en: 'magisterium', la: 'magisterium' },
	apologetik: { de: 'apologetik', en: 'apologetics', la: 'apologetics' },

	/* everything else — German and English */
	recipes: { de: 'rezepte', en: 'recipes' },
	hikes: { de: 'wanderungen', en: 'hikes' },
	cospend: { de: 'cospend', en: 'expenses' },
	register: { de: 'registrieren', en: 'register' },
	settings: { de: 'einstellungen', en: 'settings' },

	/* fitness sub-routes, under a language-neutral /fitness */
	fitnessStats: { de: 'statistik', en: 'stats' },
	fitnessHistory: { de: 'verlauf', en: 'history' },
	fitnessWorkout: { de: 'training', en: 'workout' },
	fitnessActive: { de: 'aktiv', en: 'active' },
	fitnessExercises: { de: 'uebungen', en: 'exercises' },
	fitnessCheckIn: { de: 'erfassung', en: 'check-in' },
	fitnessNutrition: { de: 'ernaehrung', en: 'nutrition' },
	fitnessSegments: { de: 'segmente', en: 'segments' }
} as const;

/** One segment spelled per locale; German is always present. */
export type SlugSet = { readonly de: string } & { readonly [lang: string]: string };

/** A param matcher accepting exactly the spellings of `set`. */
export function slugMatcher(set: SlugSet): (param: string) => boolean {
	const values = new Set(Object.values(set));
	return (param) => values.has(param);
}

/**
 * `lang` → slug for one set, as a function. A locale the set does not spell
 * gets the German slug, as the hand-written helpers this replaced did.
 */
export function slugFor<S extends SlugSet>(set: S): (lang: keyof S) => S[keyof S] {
	return (lang) => set[lang] ?? (set.de as S[keyof S]);
}

/** The locale a slug belongs to within `set`, or `undefined` if it is none of its. */
export function langOfSlug<S extends SlugSet>(set: S, slug: string | null | undefined): keyof S | undefined {
	return (Object.keys(set) as (keyof S)[]).find((lang) => set[lang] === slug);
}

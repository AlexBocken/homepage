/** German faith UI strings — source of truth for the key set. */

export const de = {
	title: 'Glaube',
	description:
		'Hier findet man einige Gebete und einen interaktiven Rosenkranz zum katholischen Glauben. Ein Fokus auf Latein und den alten Ritus wird zu bemerken sein.',
	prayers: 'Gebete',
	rosary: 'Rosenkranz',
	apologetics: 'Apologetik',
	calendar: 'Kalender',
	catechesis: 'Katechese',
	in_season: 'Zur Zeit',

	// Apologetik
	objections: 'Einwände',
	voices_answering: 'Die antwortenden Stimmen',
	objection_label: 'EINWAND',
	answered_by: 'Beantwortet von',
	alex_pick: "Alex' Wahl",
	arguments_title: 'Apologetik',
	evidences: 'Belege',
	positive_case: 'Positives',

	// Streak counters (rosary, angelus)
	day_singular: 'Tag',
	day_plural: 'Tage',
	prayed: 'Gebetet',
	prayed_today: 'Heute gebetet',
	mark_prayer: 'Gebet als gebetet markieren',
	done_today: 'Heute fertig',
	morning: 'Morgens',
	noon: 'Mittags',
	evening: 'Abends',

	// Bible modal
	close: 'Schliessen',
	loading: 'Lädt…',
	no_verses_found: 'Keine Verse gefunden',
	no_verse_data: 'Keine Versdaten verfügbar',

	// Language-availability notice (catechesis is German-only)
	only_german_pre: 'Diese Katechese ist nur auf ',
	only_german_link: 'Deutsch',
	only_german_post: ' verfügbar.'
} as const;

import type { de } from './de';

export const en = {
	title: 'Faith',
	description:
		'Here you will find some prayers and an interactive rosary for the Catholic faith. A focus on Latin and the older rite will be noticeable.',
	prayers: 'Prayers',
	rosary: 'Rosary',
	apologetics: 'Apologetics',
	calendar: 'Calendar',
	catechesis: 'Catechesis',
	in_season: 'In season',

	// Apologetik
	objections: 'Objections',
	voices_answering: 'The voices that answer',
	objection_label: 'OBJECTION',
	answered_by: 'Answered by',
	alex_pick: "Alex's pick",
	arguments_title: 'Arguments',
	evidences: 'Evidences',
	positive_case: 'Positive case',

	// Streak counters
	day_singular: 'Day',
	day_plural: 'Days',
	prayed: 'Prayed',
	prayed_today: 'Prayed today',
	mark_prayer: 'Mark prayer as prayed',
	done_today: 'Done today',
	morning: 'Morning',
	noon: 'Noon',
	evening: 'Evening',

	// Bible modal
	close: 'Close',
	loading: 'Loading…',
	no_verses_found: 'No verses found',
	no_verse_data: 'No verse data available',

	// Language-availability notice (catechesis is German-only)
	only_german_pre: 'This catechesis is only available in ',
	only_german_link: 'German',
	only_german_post: '.',

	// Prayers index
	prayers_description: 'Catholic prayers in Latin and English.',
	sign_of_cross: 'The Sign of the Cross',
	pater_noster: 'Our Father',
	fatima_prayer: 'Fatima Prayer',
	st_michael_prayer: 'Prayer to St. Michael the Archangel',
	bruder_klaus_prayer: 'Prayer of St. Nicholas of Flüe',
	st_joseph_prayer: 'Prayer to St. Joseph by Pope St. Pius X',
	the_confiteor: 'The Confiteor',
	postcommunio_prayers: 'Postcommunio Prayers',
	prayer_before_crucifix: 'Prayer Before a Crucifix',
	guardian_angel_prayer: 'Guardian Angel Prayer',
	apostles_creed: "Apostles' Creed",
	search_prayers: 'Search prayers…',
	clear_search: 'Clear search',
	text_match: 'Match in prayer text',
	filter_by_category: 'Filter by category',
	all_categories: 'All',
	eastertide_badge: 'Eastertide',

	// Prayer detail page
	nicene_creed: 'Nicene Creed',
	hail_mary: 'Hail Mary',

	// Painting titles
	painting_coronation_virgin: 'Coronation of the Virgin',
	painting_annunciation: 'The Annunciation'
} as const satisfies Record<keyof typeof de, string>;

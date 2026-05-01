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
	only_german_post: '.'
} as const satisfies Record<keyof typeof de, string>;

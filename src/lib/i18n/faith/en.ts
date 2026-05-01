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
	positive_case: 'Positive case'
} as const satisfies Record<keyof typeof de, string>;

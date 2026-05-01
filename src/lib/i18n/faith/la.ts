import type { de } from './de';

export const la = {
	title: 'Fides',
	description:
		'Hic invenies orationes et rosarium interactivum fidei catholicae.',
	prayers: 'Orationes',
	rosary: 'Rosarium Vivum',
	apologetics: 'Apologetica',
	calendar: 'Calendarium',
	catechesis: 'Catechesis',
	in_season: 'Tempore',

	// Apologetik
	objections: 'Obiectiones',
	voices_answering: 'Voces respondentes',
	objection_label: 'OBIECTIO',
	answered_by: 'Respondetur a',
	alex_pick: 'Alexandri delectus',
	arguments_title: 'Apologia',
	evidences: 'Argumenta',
	positive_case: 'Argumenta pro'
} as const satisfies Record<keyof typeof de, string>;

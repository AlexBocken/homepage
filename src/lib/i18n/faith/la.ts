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
	positive_case: 'Argumenta pro',

	// Streak counters — Latin "Dies" is invariant
	day_singular: 'Dies',
	day_plural: 'Dies',
	prayed: 'Oravi',
	prayed_today: 'Hodie oravi',
	mark_prayer: 'Orationem notatam fac',
	done_today: 'Hodie completa',
	morning: 'Mane',
	noon: 'Meridie',
	evening: 'Vespere',

	// Bible modal — not used in Latin context but the dict requires every key
	close: 'Claude',
	loading: 'Carico…',
	no_verses_found: 'Versus non inventi',
	no_verse_data: 'Nulli versus praesto',

	// Language-availability notice (catechesis is German-only)
	only_german_pre: 'Haec catechesis tantum in ',
	only_german_link: 'lingua Germanica',
	only_german_post: ' praesto est.'
} as const satisfies Record<keyof typeof de, string>;

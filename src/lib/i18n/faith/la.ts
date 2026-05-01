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
	only_german_post: ' praesto est.',

	// Prayers index
	prayers_description: 'Orationes catholicae in lingua Latina.',
	sign_of_cross: 'Signum Crucis',
	pater_noster: 'Pater Noster',
	fatima_prayer: 'Oratio Fatimensis',
	st_michael_prayer: 'Oratio ad S. Michaëlem Archangelum',
	bruder_klaus_prayer: 'Oratio S. Nicolai de Flüe',
	st_joseph_prayer: 'Oratio S. Iosephi a S. Papa Pio X',
	the_confiteor: 'Confiteor',
	postcommunio_prayers: 'Orationes post Communionem',
	prayer_before_crucifix: 'Oratio ante Crucifixum',
	guardian_angel_prayer: 'Angele Dei',
	apostles_creed: 'Symbolum Apostolorum',
	search_prayers: 'Orationes quaerere…',
	clear_search: 'Quaestionem delere',
	text_match: 'In textu orationis',
	filter_by_category: 'Filtrare per categoriam',
	all_categories: 'Omnia',
	eastertide_badge: 'Tempus Paschale',

	// Prayer detail page — Latin uses the Latin form invariantly
	nicene_creed: 'Credo',
	hail_mary: 'Ave Maria',

	// Painting titles — Latin reuses German fallback
	painting_coronation_virgin: 'Die Krönung der Jungfrau',
	painting_annunciation: 'Die Verkündigung'
} as const satisfies Record<keyof typeof de, string>;

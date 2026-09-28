/**
 * The prayer collection: one entry per prayer, in the order the overview
 * lists them. Everything the prayer routes, the sitemap and the offline
 * precache need to know about a prayer lives here; the component that renders
 * it is looked up by id in `prayerComponents.ts`, kept apart so that the slug
 * list can be imported without pulling every prayer into the bundle.
 */
import type { FaithKey, FaithLang } from '$lib/js/faithI18n';

type Dict = Record<FaithKey, string>;

export type PrayerCategory = 'essential' | 'marian' | 'saints' | 'eucharistic' | 'meal' | 'praise' | 'penitential';

export interface PrayerDef {
	id: string;
	/** URL slugs. Latin pages use the German one. Either one opens the prayer under any language. */
	slugs: { de: string; en: string };
	/** The prayer's name on its own page (and in its breadcrumb). */
	name: (t: Dict) => string;
	/** The name on the overview's card, where it differs from `name`. */
	cardName?: (t: Dict) => string;
	/** Whether it has a Latin text beside the vernacular. Monolingual prayers are left off the Latin overview. */
	bilingue: boolean;
	categories: PrayerCategory[];
	/** Extra words the overview's search matches, besides the name. */
	searchTerms: string[];
}

// TODO: Add 'morning_evening' (Morgen-/Abendgebete/Morning & Evening)
// category when corresponding prayers are added to the collection
export const PRAYER_CATEGORIES: { id: PrayerCategory; de: string; en: string; la: string }[] = [
	{ id: 'essential', de: 'Grundgebete', en: 'Essential', la: 'Fundamentales' },
	{ id: 'marian', de: 'Marianisch', en: 'Marian', la: 'Mariana' },
	{ id: 'saints', de: 'Heilige', en: 'Saints', la: 'Sancti' },
	{ id: 'eucharistic', de: 'Eucharistie', en: 'Eucharistic', la: 'Eucharistica' },
	{ id: 'meal', de: 'Tischgebete', en: 'Meal', la: 'Mensae' },
	{ id: 'praise', de: 'Lobpreis', en: 'Praise', la: 'Laudatio' },
	{ id: 'penitential', de: 'Busse', en: 'Penitential', la: 'Paenitentialia' }
];

/** A name that is the same in every language. */
const fixed = (text: string) => () => text;

export const PRAYERS: PrayerDef[] = [
	{ id: 'signOfCross', slugs: { de: 'das-heilige-kreuzzeichen', en: 'the-sign-of-the-cross' }, name: (t) => t.sign_of_cross, bilingue: true, categories: ['essential'], searchTerms: ['kreuzzeichen', 'sign of the cross', 'cross'] },
	{ id: 'gloriaPatri', slugs: { de: 'gloria-patri', en: 'gloria-patri' }, name: fixed('Glória Patri'), bilingue: true, categories: ['essential', 'praise'], searchTerms: ['gloria patri', 'glory be', 'ehre sei'] },
	{ id: 'paternoster', slugs: { de: 'paternoster', en: 'our-father' }, name: (t) => t.pater_noster, bilingue: true, categories: ['essential'], searchTerms: ['paternoster', 'our father', 'vater unser', 'pater noster'] },
	{ id: 'credo', slugs: { de: 'credo', en: 'nicene-creed' }, name: (t) => t.nicene_creed, cardName: fixed('Credo'), bilingue: true, categories: ['essential'], searchTerms: ['credo', 'creed', 'glaubensbekenntnis', 'nicene'] },
	{ id: 'aveMaria', slugs: { de: 'ave-maria', en: 'hail-mary' }, name: (t) => t.hail_mary, cardName: fixed('Ave Maria'), bilingue: true, categories: ['essential', 'marian'], searchTerms: ['ave maria', 'hail mary', 'gegrüsst seist du'] },
	{ id: 'salveRegina', slugs: { de: 'salve-regina', en: 'salve-regina' }, name: fixed('Salve Regina'), bilingue: true, categories: ['marian'], searchTerms: ['salve regina', 'hail holy queen'] },
	{ id: 'fatima', slugs: { de: 'das-fatimagebet', en: 'fatima-prayer' }, name: (t) => t.fatima_prayer, bilingue: true, categories: ['marian', 'penitential'], searchTerms: ['fatima', 'fatimagebet'] },
	{ id: 'gloria', slugs: { de: 'gloria', en: 'gloria' }, name: fixed('Glória'), bilingue: true, categories: ['praise'], searchTerms: ['gloria', 'glory', 'gloria in excelsis'] },
	{ id: 'michael', slugs: { de: 'gebet-zum-hl-erzengel-michael', en: 'prayer-to-st-michael-the-archangel' }, name: (t) => t.st_michael_prayer, bilingue: true, categories: ['saints'], searchTerms: ['michael', 'archangel', 'erzengel', 'satan', 'devil', 'teufel'] },
	{ id: 'bruderKlaus', slugs: { de: 'bruder-klaus-gebet', en: 'prayer-of-st-nicholas-of-flue' }, name: (t) => t.bruder_klaus_prayer, bilingue: false, categories: ['saints'], searchTerms: ['bruder klaus', 'nicholas', 'niklaus', 'flüe'] },
	{ id: 'joseph', slugs: { de: 'josephgebet-des-hl-papst-pius-x', en: 'prayer-to-st-joseph-by-pope-st-pius-x' }, name: (t) => t.st_joseph_prayer, bilingue: false, categories: ['saints'], searchTerms: ['joseph', 'josef', 'pius'] },
	{ id: 'confiteor', slugs: { de: 'das-confiteor', en: 'the-confiteor' }, name: (t) => t.the_confiteor, bilingue: true, categories: ['penitential'], searchTerms: ['confiteor', 'i confess', 'ich bekenne', 'mea culpa'] },
	{ id: 'guardianAngel', slugs: { de: 'schutzengel-gebet', en: 'guardian-angel-prayer' }, name: (t) => t.guardian_angel_prayer, bilingue: true, categories: ['essential'], searchTerms: ['schutzengel', 'guardian angel', 'angele dei', 'engel gottes'] },
	{ id: 'apostlesCreed', slugs: { de: 'apostolisches-glaubensbekenntnis', en: 'apostles-creed' }, name: (t) => t.apostles_creed, bilingue: true, categories: ['essential'], searchTerms: ['apostolisches glaubensbekenntnis', "apostles' creed", 'symbolum apostolorum', 'ich glaube an gott'] },
	{ id: 'tantumErgo', slugs: { de: 'tantum-ergo', en: 'tantum-ergo' }, name: fixed('Tantum Ergo'), bilingue: true, categories: ['eucharistic', 'praise'], searchTerms: ['tantum ergo', 'genitori', 'sakrament', 'sacrament'] },
	{ id: 'angelus', slugs: { de: 'angelus', en: 'angelus' }, name: fixed('Angelus'), bilingue: true, categories: ['marian'], searchTerms: ['angelus', 'engel des herrn', 'angel of the lord'] },
	{ id: 'reginaCaeli', slugs: { de: 'regina-caeli', en: 'regina-caeli' }, name: fixed('Regína Cæli'), bilingue: true, categories: ['marian'], searchTerms: ['regina caeli', 'regina coeli', 'himmelskönigin', 'queen of heaven'] },
	{ id: 'animachristi', slugs: { de: 'anima-christi', en: 'anima-christi' }, name: fixed('Ánima Christi'), bilingue: true, categories: ['eucharistic'], searchTerms: ['anima christi', 'seele christi', 'soul of christ'] },
	{ id: 'prayerbeforeacrucifix', slugs: { de: 'gebet-vor-einem-kruzifix', en: 'prayer-before-a-crucifix' }, name: (t) => t.prayer_before_crucifix, bilingue: true, categories: ['eucharistic', 'penitential'], searchTerms: ['kruzifix', 'crucifix', 'kreuz', 'cross', 'en ego'] },
	{ id: 'postcommunio', slugs: { de: 'postcommunio', en: 'postcommunio' }, name: (t) => t.postcommunio_prayers, bilingue: true, categories: ['eucharistic'], searchTerms: ['postcommunio', 'nachkommunion', 'kommunion', 'communion'] },
	{ id: 'jungfrauMutter', slugs: { de: 'jungfrau-mutter-gottes-mein', en: 'virgin-mother-of-god' }, name: (t) => t.jungfrau_mutter_prayer, bilingue: false, categories: ['marian'], searchTerms: ['jungfrau mutter gottes', 'maria hilft immer', 'virgin mother of god'] },
	{ id: 'oMyQueen', slugs: { de: 'o-meine-gebieterin', en: 'o-my-queen' }, name: (t) => t.o_my_queen_prayer, bilingue: true, categories: ['marian'], searchTerms: ['o domina mea', 'gebieterin', 'o my queen', 'queen mother'] },
	{ id: 'memorare', slugs: { de: 'gedenke-o-guetigste-jungfrau-maria', en: 'memorare' }, name: (t) => t.memorare_prayer, bilingue: true, categories: ['marian'], searchTerms: ['memorare', 'gedenke', 'remember o most gracious', 'bernard'] },
	{ id: 'hilfMaria', slugs: { de: 'hilf-maria-es-ist-zeit', en: 'help-mary' }, name: (t) => t.hilf_maria_prayer, bilingue: false, categories: ['marian'], searchTerms: ['hilf maria', 'help mary', 'mutter der barmherzigkeit'] },
	{ id: 'tischgebetVor', slugs: { de: 'tischgebet-vor-dem-essen', en: 'grace-before-meals' }, name: (t) => t.grace_before_meals, bilingue: true, categories: ['meal'], searchTerms: ['tischgebet vor', 'grace before meals', 'benedic domine', 'aller augen', 'komm herr jesus'] },
	{ id: 'tischgebetNach', slugs: { de: 'tischgebet-nach-dem-essen', en: 'grace-after-meals' }, name: (t) => t.grace_after_meals, bilingue: true, categories: ['meal'], searchTerms: ['tischgebet nach', 'grace after meals', 'agimus tibi gratias', 'wir danken dir'] }
];

/** The prayer a slug names, in either language. */
export function prayerBySlug(slug: string): PrayerDef | undefined {
	return PRAYERS.find((p) => p.slugs.de === slug || p.slugs.en === slug);
}

/** The slug a prayer is linked by under the given language. */
export function prayerSlug(prayer: PrayerDef, lang: FaithLang): string {
	return lang === 'en' ? prayer.slugs.en : prayer.slugs.de;
}

/** Every slug that opens a prayer, both languages. */
export const PRAYER_SLUGS: string[] = [...new Set(PRAYERS.flatMap((p) => [p.slugs.de, p.slugs.en]))];

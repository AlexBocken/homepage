/**
 * The headings the council set between its articles, as they would be in
 * running text.
 *
 * The German and English pages shout them in capitals, the Latin only
 * sometimes, and two other things get caught in the same net: the bar of
 * language codes at the head of every vatican.va page, and the document's own
 * title printed again above its first article. Neither is a heading.
 *
 * English and Latin can be lowered by rule; German is written out, because
 * only a reader knows that "DAS LITURGISCHE JAHR" is an adjective and a noun.
 */
import { sentenceCaseLa, titleCaseEn } from '../ccc/titles';
import type { CouncilLang } from '../../src/lib/faith/councilTypes';

/** "[AR - BE - CS - DE - EN …]" — the page's own language bar. */
const LANGUAGE_BAR = /^\[\s*[A-Z]{2}(?:\s*-\s*[A-Z]{2})+\s*\]$/;

const GERMAN_HEADINGS: [string, string][] = [
	['EINLEITUNG', 'Einleitung'],
	['VORWORT', 'Vorwort'],
	['ALLGEMEINE GRUNDLEGUNG DER RELIGIONSFREIHEIT', 'Allgemeine Grundlegung der Religionsfreiheit'],
	['DIE RELIGIONSFREIHEIT IM LICHT DER OFFENBARUNG', 'Die Religionsfreiheit im Licht der Offenbarung'],
	['DIE OFFENBARUNG IN SICH', 'Die Offenbarung in sich'],
	['DIE WEITERGABE DER GÖTTLICHEN OFFENBARUNG', 'Die Weitergabe der göttlichen Offenbarung'],
	['DIE GÖTTLICHE INSPIRATION UND DIE AUSLEGUNG DER HEILIGEN SCHRIFT', 'Die göttliche Inspiration und die Auslegung der Heiligen Schrift'],
	['DAS ALTE TESTAMENT', 'Das Alte Testament'],
	['DAS NEUE TESTAMENT', 'Das Neue Testament'],
	['DIE HEILIGE SCHRIFT IM LEBEN DER KIRCHE', 'Die Heilige Schrift im Leben der Kirche'],
	['DIE KIRCHE UND DIE BERUFUNG DES MENSCHEN', 'Die Kirche und die Berufung des Menschen'],
	['DIE WÜRDE DER MENSCHLICHEN PERSON', 'Die Würde der menschlichen Person'],
	['DIE MENSCHLICHE GEMEINSCHAFT', 'Die menschliche Gemeinschaft'],
	['DAS MENSCHLICHE SCHAFFEN IN DER WELT', 'Das menschliche Schaffen in der Welt'],
	['DIE AUFGABE DER KIRCHE IN DER WELT VON HEUTE', 'Die Aufgabe der Kirche in der Welt von heute'],
	['WICHTIGERE EINZELFRAGEN', 'Wichtigere Einzelfragen'],
	['FÖRDERUNG DER WÜRDE DER EHE UND DER FAMILIE', 'Förderung der Würde der Ehe und der Familie'],
	['DIE RICHTIGE FÖRDERUNG DES KULTURELLEN FORTSCHRITTS', 'Die richtige Förderung des kulturellen Fortschritts'],
	['DAS WIRTSCHAFTSLEBEN', 'Das Wirtschaftsleben'],
	['DAS LEBEN IN DER POLITISCHEN GEMEINSCHAFT', 'Das Leben in der politischen Gemeinschaft'],
	['DIE FÖRDERUNG DES FRIEDENS UND DER AUFBAU DER VÖLKERGEMEINSCHAFT', 'Die Förderung des Friedens und der Aufbau der Völkergemeinschaft'],
	['DAS MYSTERIUM DER KIRCHE', 'Das Mysterium der Kirche'],
	['DAS VOLK GOTTES', 'Das Volk Gottes'],
	['DIE HIERARCHISCHE VERFASSUNG DER KIRCHE,INSBESONDERE DAS BISCHOFSAMT', 'Die hierarchische Verfassung der Kirche, insbesondere das Bischofsamt'],
	['DIE LAIEN', 'Die Laien'],
	['DIE ALLGEMEINE BERUFUNG ZUR HEILIGKEIT IN DER KIRCHE', 'Die allgemeine Berufung zur Heiligkeit in der Kirche'],
	['DIE ORDENSLEUTE', 'Die Ordensleute'],
	['DAS PRIESTERTUM UND DIE SENDUNG DER KIRCHE', 'Das Priestertum und die Sendung der Kirche'],
	['DAS HEILIGE GEHEIMNIS DER EUCHARISTIE', 'Das heilige Geheimnis der Eucharistie'],
	['DIE ÜBRIGEN SAKRAMENTE UND SAKRAMENTALIEN', 'Die übrigen Sakramente und Sakramentalien'],
	['DAS STUNDENGEBET', 'Das Stundengebet'],
	['DAS LITURGISCHE JAHR', 'Das liturgische Jahr'],
	['DIE KIRCHENMUSIK', 'Die Kirchenmusik'],
	['DIE KATHOLISCHEN PRINZIPIEN DES ÖKUMENISMUS', 'Die katholischen Prinzipien des Ökumenismus'],
	['DIE PRAKTISCHE VERWIRKLICHUNG DES ÖKUMENISMUS', 'Die praktische Verwirklichung des Ökumenismus'],
	['DIE VOM RÖMISCHEN APOSTOLISCHEN STUHL GETRENNTEN KIRCHEN UND KIRCHLICHEN GEMEINSCHAFTEN', 'Die vom Römischen Apostolischen Stuhl getrennten Kirchen und kirchlichen Gemeinschaften'],
];

const GERMAN = new Map(GERMAN_HEADINGS);
const letters = (text: string) => text.toUpperCase().replace(/[^A-ZÄÖÜ]/g, '');

/**
 * Whether this line is really a heading over what follows, given what the
 * document calls itself.
 */
export function isHeading(text: string, title: string, subtitle: string): boolean {
	if (LANGUAGE_BAR.test(text.trim())) return false;
	const own = letters(text);
	if (!own) return false;
	// The title again — "Konstitution über die heilige Liturgie Sacrosanctum
	// concilium" — or a piece of the subtitle, which the page header already says.
	if (own.includes(letters(title))) return false;
	if (letters(subtitle).includes(own)) return false;
	return true;
}

/** A heading as the reader shows it. A mixed-case one is left as it stands. */
export function readable(lang: CouncilLang, text: string): string {
	const trimmed = text.replace(/\s+/g, ' ').trim();
	if (trimmed !== trimmed.toUpperCase()) return trimmed;
	if (lang === 'de') return GERMAN.get(trimmed) ?? trimmed;
	return lang === 'en' ? titleCaseEn(trimmed) : sentenceCaseLa(trimmed);
}

/** German headings the table has no entry for — the importer reports them. */
export function missingGerman(text: string): string | null {
	const trimmed = text.replace(/\s+/g, ' ').trim();
	if (trimmed !== trimmed.toUpperCase() || GERMAN.has(trimmed)) return null;
	return trimmed;
}

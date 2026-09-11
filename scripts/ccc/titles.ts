/**
 * Readable titles.
 *
 * All three editions set their structural headings in capitals and run the
 * ordinal into the title — "ARTIKEL 2 DAS SAKRAMENT DER FIRMUNG",
 * "CHAPTER ONE THE SACRAMENTS OF CHRISTIAN INITIATION". The ordinal is a
 * label, not part of the name, so it is split off; the rest is put back into
 * ordinary case.
 *
 * English and Latin can be cased mechanically — English by a list of the words
 * that stay small, Latin by sentence case plus the handful of words that are
 * proper nouns. German cannot: "DIE SAKRAMENTE DER CHRISTLICHEN INITIATION"
 * needs to know that `Sakramente` is a noun and `christlichen` an adjective,
 * which no rule here could tell. Those titles are written out below.
 */

export type Titled = { label: string | null; title: string };

const ORDINAL_WORD: Record<string, string> = {
	ERSTER: 'Erster', ZWEITER: 'Zweiter', DRITTER: 'Dritter', VIERTER: 'Vierter',
	ERSTES: 'Erstes', ZWEITES: 'Zweites', DRITTES: 'Drittes', VIERTES: 'Viertes',
	ONE: 'One', TWO: 'Two', THREE: 'Three', FOUR: 'Four',
	PRIMA: 'Prima', SECUNDA: 'Secunda', TERTIA: 'Tertia', QUARTA: 'Quarta',
	PRIMUM: 'Primum', SECUNDUM: 'Secundum', TERTIUM: 'Tertium', QUARTUM: 'Quartum'
};

const UNIT: Record<string, string> = {
	TEIL: 'Teil', ABSCHNITT: 'Abschnitt', KAPITEL: 'Kapitel', ARTIKEL: 'Artikel', ABSATZ: 'Absatz',
	PART: 'Part', SECTION: 'Section', CHAPTER: 'Chapter', ARTICLE: 'Article', PARAGRAPH: 'Paragraph',
	PARS: 'Pars', SECTIO: 'Sectio', CAPUT: 'Caput', ARTICULUS: 'Articulus', PARAGRAPHUS: 'Paragraphus'
};

/** "ERSTES KAPITEL: DIE …" → label "Erstes Kapitel", and the rest. */
function splitOrdinal(text: string): Titled {
	// German and Latin put the ordinal first, English the unit.
	const german = /^(ERSTER|ZWEITER|DRITTER|VIERTER|ERSTES|ZWEITES|DRITTES|VIERTES)\s+(TEIL|ABSCHNITT|KAPITEL)\b\s*[:.·]?\s*/i.exec(text);
	if (german) return { label: `${ORDINAL_WORD[german[1].toUpperCase()]} ${UNIT[german[2].toUpperCase()]}`, title: text.slice(german[0].length) };

	const latin = /^(PARS|SECTIO|CAPUT)\s+(PRIMA|SECUNDA|TERTIA|QUARTA|PRIMUM|SECUNDUM|TERTIUM|QUARTUM)\b\s*[:.·]?\s*/i.exec(text);
	if (latin) return { label: `${UNIT[latin[1].toUpperCase()]} ${ORDINAL_WORD[latin[2].toUpperCase()]}`, title: text.slice(latin[0].length) };

	const english = /^(PART|SECTION|CHAPTER)\s+(ONE|TWO|THREE|FOUR)\b\s*[:.·]?\s*/i.exec(text);
	if (english) return { label: `${UNIT[english[1].toUpperCase()]} ${ORDINAL_WORD[english[2].toUpperCase()]}`, title: text.slice(english[0].length) };

	const numbered = /^(ARTIKEL|ABSATZ|ARTICLE|PARAGRAPH|ARTICULUS|PARAGRAPHUS)\s+(\d+)\b\s*[:.·]?\s*/i.exec(text);
	if (numbered) return { label: `${UNIT[numbered[1].toUpperCase()]} ${numbered[2]}`, title: text.slice(numbered[0].length) };

	return { label: null, title: text };
}

/* ---------------- English ---------------- */

const SMALL_EN = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'the', 'to', 'upon', 'with', 'is', 'it', 'his', 'her', 'not']);

function titleCaseEn(text: string): string {
	if (text !== text.toUpperCase()) return text;
	const words = text.toLowerCase().split(/(\s+|[-–—"“”'‘’(),.:;!?])/);
	let first = true;
	return words
		.map((w) => {
			if (!/[a-zà-ÿ]/.test(w)) return w;
			const keepSmall = !first && SMALL_EN.has(w);
			first = false;
			return keepSmall ? w : w.charAt(0).toUpperCase() + w.slice(1);
		})
		.join('');
}

/* ---------------- Latin ---------------- */

/** Latin sets titles in sentence case; only these keep their capital. */
const PROPER_LA = new Set([
	'deus', 'dei', 'deo', 'deum', 'domini', 'dominus', 'domino', 'dominum',
	'christus', 'christi', 'christo', 'christum', 'iesus', 'iesu', 'iesum',
	'spiritus', 'spiritu', 'spiritum', 'sancti', 'sanctus', 'sancto', 'sanctum',
	'ecclesia', 'ecclesiae', 'ecclesiam', 'maria', 'mariae', 'mariam',
	'pater', 'patris', 'patrem', 'patre', 'filius', 'filii', 'filium', 'filio',
	'israel', 'testamento', 'testamentum', 'evangelii', 'evangelium', 'scriptura', 'scripturae',
	'decalogus', 'decalogi', 'baptismi', 'baptismus', 'eucharistiae', 'eucharistia',
	'verbum', 'verbi', 'trinitas', 'trinitatis', 'pascha', 'paschale', 'credo', 'credimus'
]);

function sentenceCaseLa(text: string): string {
	if (text !== text.toUpperCase()) return text;
	let first = true;
	return text
		.toLowerCase()
		.split(/(\s+|[-–—«»"“”'‘’(),.:;!?])/)
		.map((w) => {
			if (!/[a-zà-ÿ]/.test(w)) return w;
			const capital = first || PROPER_LA.has(w);
			first = false;
			return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
		})
		.join('');
}

/* ---------------- German ---------------- */

/**
 * The German edition's structural titles, set as they would be in running
 * text. Keyed by what the source prints, normalised for whitespace and for the
 * four kinds of hyphen it mixes, so the table survives a change of section ids
 * and a missing entry shows up as an untouched capitalised title rather than as
 * a wrong one. `pnpm ccc:import` lists anything missing.
 */
const normalise = (text: string) => text.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();

const GERMAN_TITLES: [string, string][] = [
	['APOSTOLISCHE KONSTITUTION „FIDEI DEPOSITUM"', 'Apostolische Konstitution „Fidei depositum“'],
	['PROLOG', 'Prolog'],

	// Part one — the profession of faith
	['DAS GLAUBENSBEKENNTNIS', 'Das Glaubensbekenntnis'],
	['„ICH GLAUBE" - „WIR GLAUBEN"', '„Ich glaube“ – „Wir glauben“'],
	['DER MENSCH IST „GOTTFÄHIG"', 'Der Mensch ist „gottfähig“'],
	['GOTT GEHT AUF DEN MENSCHEN ZU', 'Gott geht auf den Menschen zu'],
	['DIE OFFENBARUNG GOTTES', 'Die Offenbarung Gottes'],
	['DIE WEITERGABE DER GÖTTLICHEN OFFENBARUNG', 'Die Weitergabe der göttlichen Offenbarung'],
	['DIE HEILIGE SCHRIFT', 'Die Heilige Schrift'],
	['DIE ANTWORT DES MENSCHEN AN GOTT', 'Die Antwort des Menschen an Gott'],
	['ICH GLAUBE', 'Ich glaube'],
	['WIR GLAUBEN', 'Wir glauben'],
	['DAS CHRISTLICHE GLAUBENSBEKENNTNIS', 'Das christliche Glaubensbekenntnis'],
	['„ICH GLAUBE AN GOTT DEN VATER"', '„Ich glaube an Gott den Vater“'],
	['„ICH GLAUBE AN GOTT, DEN VATER, DEN ALLMÄCHTIGEN, DEN SCHÖPFER DES HIMMELS UND DER ERDE"', '„Ich glaube an Gott, den Vater, den Allmächtigen, den Schöpfer des Himmels und der Erde“'],
	['„ICH GLAUBE AN GOTT"', '„Ich glaube an Gott“'],
	['DER VATER', 'Der Vater'],
	['DER ALLMÄCHTIGE', 'Der Allmächtige'],
	['DER SCHÖPFER', 'Der Schöpfer'],
	['HIMMEL UND ERDE', 'Himmel und Erde'],
	['DER MENSCH', 'Der Mensch'],
	['DER SÜNDENFALL', 'Der Sündenfall'],
	['ICH GLAUBE AN JESUS CHRISTUS, GOTTES EINGEBORENEN SOHN', 'Ich glaube an Jesus Christus, Gottes eingeborenen Sohn'],
	['„UND AN JESUS CHRISTUS, SEINEN EINGEBORENEN SOHN, UNSEREN HERRN"', '„Und an Jesus Christus, seinen eingeborenen Sohn, unseren Herrn“'],
	['„JESUS CHRISTUS IST EMPFANGEN DURCH DEN HEILIGEN GEIST, GEBOREN VON DER JUNGFRAU MARIA"', '„Jesus Christus ist empfangen durch den Heiligen Geist, geboren von der Jungfrau Maria“'],
	['DER SOHN GOTTES IST MENSCH GEWORDEN', 'Der Sohn Gottes ist Mensch geworden'],
	['„...EMPFANGEN DURCH DEN HEILIGEN GEIST, GEBOREN VON DER JUNGFRAU MARIA"', '„… empfangen durch den Heiligen Geist, geboren von der Jungfrau Maria“'],
	['DIE MYSTERIEN DES LEBENS CHRISTI', 'Die Mysterien des Lebens Christi'],
	['„JESUS CHRISTUS ... GELITTEN UNTER PONTIUS PILATUS, GEKREUZIGT, GESTORBEN UND BEGRABEN"', '„Jesus Christus … gelitten unter Pontius Pilatus, gekreuzigt, gestorben und begraben“'],
	['JESUS UND ISRAEL', 'Jesus und Israel'],
	['JESUS IST AM KREUZ GESTORBEN', 'Jesus ist am Kreuz gestorben'],
	['JESUS CHRISTUS IST BEGRABEN WORDEN', 'Jesus Christus ist begraben worden'],
	['JESUS CHRISTUS IST „HINABGESTIEGEN IN DAS REICH DES TODES, AM DRITTEN TAGE AUFERSTANDEN VON DEN TOTEN"', 'Jesus Christus ist „hinabgestiegen in das Reich des Todes, am dritten Tage auferstanden von den Toten“'],
	['CHRISTUS IST HINABGESTIEGEN ZU DEN TOTEN', 'Christus ist hinabgestiegen zu den Toten'],
	['AM DRITTEN TAG IST ER AUFERSTANDEN VON DEN TOTEN', 'Am dritten Tag ist er auferstanden von den Toten'],
	['JESUS IST „AUFGEFAHREN IN DEN HIMMEL; ER SITZT ZUR RECHTEN GOTTES, DES ALLMÄCHTIGEN VATERS"', 'Jesus ist „aufgefahren in den Himmel; er sitzt zur Rechten Gottes, des allmächtigen Vaters“'],
	['„VON DORT WIRD ER KOMMEN, ZU RICHTEN DIE LEBENDEN UND DIE TOTEN"', '„Von dort wird er kommen, zu richten die Lebenden und die Toten“'],
	['ICH GLAUBE AN DEN HEILIGEN GEIST', 'Ich glaube an den Heiligen Geist'],
	['„ICH GLAUBE AN DEN HEILIGEN GEIST"', '„Ich glaube an den Heiligen Geist“'],
	['„ICH GLAUBE ... DIE HEILIGE KATHOLISCHE KIRCHE"', '„Ich glaube … die heilige katholische Kirche“'],
	['DIE KIRCHE IM PLANE GOTTES', 'Die Kirche im Plane Gottes'],
	['DIE KIRCHE -VOLK GOTTES, LEIB CHRISTI, TEMPEL DES HEILIGEN GEISTES', 'Die Kirche – Volk Gottes, Leib Christi, Tempel des Heiligen Geistes'],
	['DIE EINE, HEILIGE, KATHOLISCHE UND APOSTOLISCHE KIRCHE', 'Die eine, heilige, katholische und apostolische Kirche'],
	['DIE CHRISTGLÄUBIGEN -HIERARCHIE, LAIEN, ORDENSLEUTE', 'Die Christgläubigen – Hierarchie, Laien, Ordensleute'],
	['DIE GEMEINSCHAFT DER HEILIGEN', 'Die Gemeinschaft der Heiligen'],
	['MARIA - MUTTER CHRISTI, MUTTER DER KIRCHE', 'Maria – Mutter Christi, Mutter der Kirche'],
	['„ICH GLAUBE... DIE VERGEBUNG DER SÜNDEN"', '„Ich glaube … die Vergebung der Sünden“'],
	['„ICH GLAUBE ... DIE AUFERSTEHUNG DER TOTEN"', '„Ich glaube … die Auferstehung der Toten“'],
	['„ICH GLAUBE... DAS EWIGE LEBEN"', '„Ich glaube … das ewige Leben“'],

	// Part two — the celebration of the Christian mystery
	['DIE FEIER DES CHRISTLICHEN MYSTERIUMS', 'Die Feier des christlichen Mysteriums'],
	['DIE SAKRAMENTALE HEILSORDNUNG', 'Die sakramentale Heilsordnung'],
	['DAS PASCHA-MYSTERIUM IN DER ZEIT DER KIRCHE', 'Das Pascha-Mysterium in der Zeit der Kirche'],
	['DIE LITURGIE - WERK DERHEILIGSTEN DREIFALTIGKEIT', 'Die Liturgie – Werk der heiligsten Dreifaltigkeit'],
	['DAS PASCHA-MYSTERIUM IN DEN SAKRAMENTEN DER KIRCHE', 'Das Pascha-Mysterium in den Sakramenten der Kirche'],
	['DIE SAKRAMENTALE FEIER DES PASCHA-MYSTERIUMS', 'Die sakramentale Feier des Pascha-Mysteriums'],
	['DIE LITURGIE DER KIRCHE FEIERN', 'Die Liturgie der Kirche feiern'],
	['VIELFALT DER LITURGIE -EINHEIT DES MYSTERIUMS', 'Vielfalt der Liturgie – Einheit des Mysteriums'],
	['DIE SIEBEN SAKRAMENTE DER KIRCHE', 'Die sieben Sakramente der Kirche'],
	['DIE SAKRAMENTE DER CHRISTLICHEN INITIATION', 'Die Sakramente der christlichen Initiation'],
	['DAS SAKRAMENT DER TAUFE', 'Das Sakrament der Taufe'],
	['DAS SAKRAMENT DER FIRMUNG', 'Das Sakrament der Firmung'],
	['DAS SAKRAMENT DER EUCHARISTIE', 'Das Sakrament der Eucharistie'],
	['DIE SAKRAMENTE DER HEILUNG', 'Die Sakramente der Heilung'],
	['DAS SAKRAMENT DER BUSSE UND DER VERSÖHNUNG', 'Das Sakrament der Busse und der Versöhnung'],
	['DIE KRANKENSALBUNG', 'Die Krankensalbung'],
	['DIE SAKRAMENTE DES DIENSTES FÜR DIE GEMEINSCHAFT', 'Die Sakramente des Dienstes für die Gemeinschaft'],
	['DAS SAKRAMENT DER WEIHE', 'Das Sakrament der Weihe'],
	['DAS SAKRAMENT DER EHE', 'Das Sakrament der Ehe'],
	['ANDERE LITURGISCHE FEIERN', 'Andere liturgische Feiern'],
	['DIE SAKRAMENTALIEN', 'Die Sakramentalien'],
	['DAS CHRISTLICHE BEGRÄBNIS', 'Das christliche Begräbnis'],

	// Part three — life in Christ
	['DAS LEBEN IN CHRISTUS', 'Das Leben in Christus'],
	['DIE BERUFUNG DES MENSCHEN: DAS LEBEN IM HEILIGEN GEIST', 'Die Berufung des Menschen: das Leben im Heiligen Geist'],
	['DIE WÜRDE DES MENSCHEN', 'Die Würde des Menschen'],
	['DER MENSCH: GOTTES EBENBILD', 'Der Mensch: Gottes Ebenbild'],
	['UNSERE BERUFUNG ZUR SELIGKEIT', 'Unsere Berufung zur Seligkeit'],
	['DIE FREIHEIT DES MENSCHEN', 'Die Freiheit des Menschen'],
	['DER SITTLICHE CHARAKTER DER MENSCHLICHEN HANDLUNGEN', 'Der sittliche Charakter der menschlichen Handlungen'],
	['DIE SITTLICHKEIT DER LEIDENSCHAFTEN', 'Die Sittlichkeit der Leidenschaften'],
	['DAS GEWISSEN', 'Das Gewissen'],
	['DIE TUGENDEN', 'Die Tugenden'],
	['DIE SÜNDE', 'Die Sünde'],
	['DIE MENSCHLICHE GEMEINSCHAFT', 'Die menschliche Gemeinschaft'],
	['PERSON UND GESELLSCHAFT', 'Person und Gesellschaft'],
	['DIE BETEILIGUNG AM GESELLSCHAFTLICHEN LEBEN', 'Die Beteiligung am gesellschaftlichen Leben'],
	['DIE SOZIALE GERECHTIGKEIT', 'Die soziale Gerechtigkeit'],
	['DAS HEIL GOTTES: DAS GESETZ UND DIE GNADE', 'Das Heil Gottes: das Gesetz und die Gnade'],
	['DAS SITTLICHE GESETZ', 'Das sittliche Gesetz'],
	['GNADE UND RECHTFERTIGUNG', 'Gnade und Rechtfertigung'],
	['DIE KIRCHE - MUTTER UND LEHRMEISTERIN', 'Die Kirche – Mutter und Lehrmeisterin'],
	['DIE ZEHN GEBOTE', 'Die Zehn Gebote'],
	['Deuternonomium 5,6 - 21', 'Deuteronomium 5,6–21'],
	['Exodus 20,2-17', 'Exodus 20,2–17'],
	['„DU SOLLST DEN HERRN, DEINEN GOTT, LIEBEN MIT GANZEM HERZEN, GANZER SEELE UND MIT ALL DEINER KRAFT"', '„Du sollst den Herrn, deinen Gott, lieben mit ganzem Herzen, ganzer Seele und mit all deiner Kraft“'],
	['DAS ERSTE GEBOT', 'Das erste Gebot'],
	['DAS ZWEITE GEBOT', 'Das zweite Gebot'],
	['DAS DRITTE GEBOT', 'Das dritte Gebot'],
	['„DU SOLLST DEINEN NÄCHSTEN LIEBEN WIE DICH SELBST"', '„Du sollst deinen Nächsten lieben wie dich selbst“'],
	['DAS VIERTE GEBOT', 'Das vierte Gebot'],
	['DAS FÜNFTE GEBOT', 'Das fünfte Gebot'],
	['DAS SECHSTE GEBOT', 'Das sechste Gebot'],
	['DAS SIEBTE GEBOT', 'Das siebte Gebot'],
	['DAS ACHTE GEBOT', 'Das achte Gebot'],
	['DAS NEUNTE GEBOT', 'Das neunte Gebot'],
	['DAS ZEHNTE GEBOT', 'Das zehnte Gebot'],

	// Part four — Christian prayer
	['DAS CHRISTLICHE GEBET', 'Das christliche Gebet'],
	['DAS GEBET IM CHRISTLICHEN LEBEN', 'Das Gebet im christlichen Leben'],
	['DIE OFFENBARUNG DES GEBETES', 'Die Offenbarung des Gebetes'],
	['IM ALTEN BUND', 'Im Alten Bund'],
	['IN DER FÜLLE DER ZEIT', 'In der Fülle der Zeit'],
	['IN DER ZEIT DER KIRCHE', 'In der Zeit der Kirche'],
	['DIE ÜBERLIEFERUNG DES GEBETES', 'Die Überlieferung des Gebetes'],
	['AN DEN QUELLEN DES GEBETES', 'An den Quellen des Gebetes'],
	['DER WEG DES GEBETES', 'Der Weg des Gebetes'],
	['FÜHRER ZUM GEBET', 'Führer zum Gebet'],
	['DAS GEBETSLEBEN', 'Das Gebetsleben'],
	['FORMEN DES GEBETES', 'Formen des Gebetes'],
	['KAMPF DES BETENS', 'Kampf des Betens'],
	['DAS GEBET DES HERRN: „VATER UNSER!"', 'Das Gebet des Herrn: „Vater unser!“'],
	['„DIE ZUSAMMENFASSUNG DES GANZEN EVANGELIUMS"', '„Die Zusammenfassung des ganzen Evangeliums“'],
	['„VATER UNSER IM HIMMEL"', '„Vater unser im Himmel“'],
	['DIE SIEBEN BITTEN', 'Die sieben Bitten']
];

const GERMAN = new Map(GERMAN_TITLES.map(([from, to]) => [normalise(from), to]));

/* ---------------- */

export function readable(lang: 'de' | 'en' | 'la', raw: string): Titled {
	const { label, title } = splitOrdinal(raw.trim());
	if (lang === 'de') return { label, title: GERMAN.get(normalise(title)) ?? title };
	return { label, title: lang === 'en' ? titleCaseEn(title) : sentenceCaseLa(title) };
}

/** Titles the German table has no entry for — the importer reports them. */
export function missingGerman(raw: string): string | null {
	const { title } = splitOrdinal(raw.trim());
	if (GERMAN.has(normalise(title))) return null;
	return title === title.toUpperCase() && /[A-ZÄÖÜ]/.test(title) ? title : null;
}

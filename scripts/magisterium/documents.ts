/**
 * Every papal or curial document the Catechism cites, and where vatican.va
 * keeps it.
 *
 * The Catechism's footnotes name 47 of them, some once and `Centesimus annus`
 * twenty-seven times. They are worth hosting for the same reason the council
 * was: a citation the reader cannot open is a dead word on the page.
 *
 * Three things make this harder than the council was.
 *
 *  - **Three URL shapes.** Encyclicals and exhortations sit under
 *    `/content/<pope>/<lang>/<section>/documents/`; apostolic letters put the
 *    year in between; the CDF is not under a pope at all and spells Latin
 *    `lt`. The First Vatican Council is in the archive with the Second.
 *  - **Ragged languages.** vatican.va answers 200 for a language it does not
 *    have — `leo-xiii/de/…/rerum-novarum` is a German page frame around an
 *    empty document — so which languages exist is discovered by parsing, not
 *    by asking. `langs` is not in this table for that reason.
 *  - **No abbreviations.** The Catechism cites the council as "LG 11" but
 *    these by their incipit, in Latin, in all three editions. `title` is
 *    therefore what the linkifier matches on, and it must be exactly the
 *    spelling the editions print.
 *
 * `articles` is how many articles the document has. It parses nothing; it is
 * there so that a parse which comes out short says so instead of quietly
 * shipping half an encyclical. `pnpm magisterium:import --report` prints what
 * was found, which is how the numbers below were arrived at.
 */
import type { MagisteriumAuthor, MagisteriumKind, MagisteriumLang } from '../../src/lib/faith/magisteriumTypes';

/** Where a document lives, which differs by who issued it. */
export type Where =
	/** `/content/<pope>/<lang>/<section>/documents/<file>.html` */
	| { at: 'pope'; pope: string; section: string; file: string }
	/** The same, with the year folded in: `/apost_letters/<year>/documents/`. */
	| { at: 'letter'; pope: string; year: number; file: string }
	/** `/roman_curia/congregations/cfaith/documents/<file>_<lang>.html`. */
	| { at: 'cdf'; file: string }
	/** `/archive/hist_councils/i-vatican-council/documents/<file>_<lang>.html`. */
	| { at: 'vatican-i'; file: string };

export type MagisteriumSource = {
	slug: string;
	/** The incipit, spelled as the Catechism's editions print it. */
	title: string;
	kind: MagisteriumKind;
	author: MagisteriumAuthor;
	date: string;
	where: Where;
	/** How many articles it has; 0 while it is still being found out. */
	articles: number;
	/**
	 * The opening words of article 1, where the page leaves it unnumbered and
	 * starts counting at 2 — steadier than a position, since a re-flowed page
	 * moves paragraphs about but does not re-word them.
	 */
	opens?: Partial<Record<MagisteriumLang, string>>;
	/**
	 * A language whose text is there but cannot be cited, and why. A citation
	 * carries a number alone — "Familiaris consortio, 79" — so an edition that
	 * numbers something else would answer with the wrong passage, which is
	 * worse than answering with nothing.
	 */
	skip?: Partial<Record<MagisteriumLang, string>>;
};

const pope = (pope: string, section: string, file: string): Where => ({ at: 'pope', pope, section, file });

/**
 * Four documents the Catechism cites are not here, because no edition of them
 * can be cited by article: `Divino afflante Spiritu`, `Divinae consortium
 * naturae`, `Sacram unctionem infirmorum` and the First Vatican Council's
 * `Pastor aeternus` are all published as continuous prose, with nothing in
 * them to link to. Their citations stay plain text, as they were.
 */
export const MAGISTERIUM: MagisteriumSource[] = [
	// ---- Leo XIII (no German on vatican.va) ----
	{ slug: 'diuturnum-illud', title: 'Diuturnum illud', kind: 'encyclical', author: 'leo-xiii', date: '1881-06-29', where: pope('leo-xiii', 'encyclicals', 'hf_l-xiii_enc_29061881_diuturnum'), articles: 34 },
	{ slug: 'immortale-dei', title: 'Immortale Dei', kind: 'encyclical', author: 'leo-xiii', date: '1885-11-01', where: pope('leo-xiii', 'encyclicals', 'hf_l-xiii_enc_01111885_immortale-dei'), articles: 50, skip: { la: 'the Latin numbers 25 sections where every citation counts 50' } },
	{ slug: 'libertas-praestantissimum', title: 'Libertas praestantissimum', kind: 'encyclical', author: 'leo-xiii', date: '1888-06-20', where: pope('leo-xiii', 'encyclicals', 'hf_l-xiii_enc_20061888_libertas'), articles: 27 },
	{ slug: 'rerum-novarum', title: 'Rerum novarum', kind: 'encyclical', author: 'leo-xiii', date: '1891-05-15', where: pope('leo-xiii', 'encyclicals', 'hf_l-xiii_enc_15051891_rerum-novarum'), articles: 64, opens: { en: 'That the spirit of revolutionary change' } },

	// ---- Pius XI (no German on vatican.va) ----
	{ slug: 'divini-illius-magistri', title: 'Divini illius Magistri', kind: 'encyclical', author: 'pius-xi', date: '1929-12-31', where: pope('pius-xi', 'encyclicals', 'hf_p-xi_enc_31121929_divini-illius-magistri'), articles: 102 },
	{ slug: 'casti-connubii', title: 'Casti connubii', kind: 'encyclical', author: 'pius-xi', date: '1930-12-31', where: pope('pius-xi', 'encyclicals', 'hf_p-xi_enc_19301231_casti-connubii'), articles: 130 },
	{ slug: 'quadragesimo-anno', title: 'Quadragesimo anno', kind: 'encyclical', author: 'pius-xi', date: '1931-05-15', where: pope('pius-xi', 'encyclicals', 'hf_p-xi_enc_19310515_quadragesimo-anno'), articles: 148, skip: { la: 'the Latin is the AAS text, which numbers nothing' } },
	{ slug: 'divini-redemptoris', title: 'Divini Redemptoris', kind: 'encyclical', author: 'pius-xi', date: '1937-03-19', where: pope('pius-xi', 'encyclicals', 'hf_p-xi_enc_19370319_divini-redemptoris'), articles: 82 },

	// ---- Pius XII ----
	{ slug: 'summi-pontificatus', title: 'Summi Pontificatus', kind: 'encyclical', author: 'pius-xii', date: '1939-10-20', where: pope('pius-xii', 'encyclicals', 'hf_p-xii_enc_20101939_summi-pontificatus'), articles: 117 },
	{ slug: 'mystici-corporis', title: 'Mystici Corporis Christi', kind: 'encyclical', author: 'pius-xii', date: '1943-06-29', where: pope('pius-xii', 'encyclicals', 'hf_p-xii_enc_29061943_mystici-corporis-christi'), articles: 220 },
	{ slug: 'provida-mater', title: 'Provida Mater Ecclesia', kind: 'constitution', author: 'pius-xii', date: '1947-02-02', where: pope('pius-xii', 'apost_constitutions', 'hf_p-xii_apc_19470202_provida-mater-ecclesia'), articles: 26, skip: { la: 'the Latin is the AAS text, which numbers nothing' } },
	{ slug: 'mediator-dei', title: 'Mediator Dei', kind: 'encyclical', author: 'pius-xii', date: '1947-11-20', where: pope('pius-xii', 'encyclicals', 'hf_p-xii_enc_20111947_mediator-dei'), articles: 188 },
	{ slug: 'sacramentum-ordinis', title: 'Sacramentum Ordinis', kind: 'constitution', author: 'pius-xii', date: '1947-11-30', where: pope('pius-xii', 'apost_constitutions', 'hf_p-xii_apc_19471130_sacramentum-ordinis'), articles: 6 },
	{ slug: 'humani-generis', title: 'Humani generis', kind: 'encyclical', author: 'pius-xii', date: '1950-08-12', where: pope('pius-xii', 'encyclicals', 'hf_p-xii_enc_12081950_humani-generis'), articles: 44 },
	{ slug: 'munificentissimus-deus', title: 'Munificentissimus Deus', kind: 'constitution', author: 'pius-xii', date: '1950-11-01', where: pope('pius-xii', 'apost_constitutions', 'hf_p-xii_apc_19501101_munificentissimus-deus'), articles: 48 },
	{ slug: 'fidei-donum', title: 'Fidei donum', kind: 'encyclical', author: 'pius-xii', date: '1957-04-21', where: pope('pius-xii', 'encyclicals', 'hf_p-xii_enc_21041957_fidei-donum'), articles: 27 },

	// ---- John XXIII ----
	{ slug: 'mater-et-magistra', title: 'Mater et magistra', kind: 'encyclical', author: 'john-xxiii', date: '1961-05-15', where: pope('john-xxiii', 'encyclicals', 'hf_j-xxiii_enc_15051961_mater'), articles: 245, skip: { de: 'the German translation numbers its own sections, not the Latin’s' } },
	{ slug: 'pacem-in-terris', title: 'Pacem in terris', kind: 'encyclical', author: 'john-xxiii', date: '1963-04-11', where: pope('john-xxiii', 'encyclicals', 'hf_j-xxiii_enc_11041963_pacem'), articles: 172, skip: { de: 'the German translation numbers 57 sections against the Latin’s 172' } },

	// ---- Paul VI ----
	{ slug: 'mysterium-fidei', title: 'Mysterium fidei', kind: 'encyclical', author: 'paul-vi', date: '1965-09-03', where: pope('paul-vi', 'encyclicals', 'hf_p-vi_enc_03091965_mysterium'), articles: 76, skip: { de: 'the German runs one article ahead of the Latin from its first page' } },
	{ slug: 'indulgentiarum-doctrina', title: 'Indulgentiarum doctrina', kind: 'constitution', author: 'paul-vi', date: '1967-01-01', where: pope('paul-vi', 'apost_constitutions', 'hf_p-vi_apc_01011967_indulgentiarum-doctrina'), articles: 12 },
	{ slug: 'populorum-progressio', title: 'Populorum progressio', kind: 'encyclical', author: 'paul-vi', date: '1967-03-26', where: pope('paul-vi', 'encyclicals', 'hf_p-vi_enc_26031967_populorum'), articles: 87, skip: { de: 'the German translation numbers 60 sections against the Latin’s 87' } },
	{ slug: 'humanae-vitae', title: 'Humanae vitae', kind: 'encyclical', author: 'paul-vi', date: '1968-07-25', where: pope('paul-vi', 'encyclicals', 'hf_p-vi_enc_25071968_humanae-vitae'), articles: 31 },
	{ slug: 'marialis-cultus', title: 'Marialis cultus', kind: 'exhortation', author: 'paul-vi', date: '1974-02-02', where: pope('paul-vi', 'apost_exhortations', 'hf_p-vi_exh_19740202_marialis-cultus'), articles: 58 },
	{ slug: 'evangelii-nuntiandi', title: 'Evangelii nuntiandi', kind: 'exhortation', author: 'paul-vi', date: '1975-12-08', where: pope('paul-vi', 'apost_exhortations', 'hf_p-vi_exh_19751208_evangelii-nuntiandi'), articles: 82 },

	// ---- John Paul II ----
	{ slug: 'redemptor-hominis', title: 'Redemptor hominis', kind: 'encyclical', author: 'john-paul-ii', date: '1979-03-04', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_04031979_redemptor-hominis'), articles: 22 },
	{ slug: 'catechesi-tradendae', title: 'Catechesi tradendae', kind: 'exhortation', author: 'john-paul-ii', date: '1979-10-16', where: pope('john-paul-ii', 'apost_exhortations', 'hf_jp-ii_exh_16101979_catechesi-tradendae'), articles: 73 },
	{ slug: 'dives-in-misericordia', title: 'Dives in misericordia', kind: 'encyclical', author: 'john-paul-ii', date: '1980-11-30', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_30111980_dives-in-misericordia'), articles: 15 },
	{ slug: 'laborem-exercens', title: 'Laborem exercens', kind: 'encyclical', author: 'john-paul-ii', date: '1981-09-14', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_14091981_laborem-exercens'), articles: 27 },
	{ slug: 'familiaris-consortio', title: 'Familiaris consortio', kind: 'exhortation', author: 'john-paul-ii', date: '1981-11-22', where: pope('john-paul-ii', 'apost_exhortations', 'hf_jp-ii_exh_19811122_familiaris-consortio'), articles: 86, skip: { la: 'the Latin on vatican.va breaks off at article 64 of 86' } },
	{ slug: 'reconciliatio-et-paenitentia', title: 'Reconciliatio et paenitentia', kind: 'exhortation', author: 'john-paul-ii', date: '1984-12-02', where: pope('john-paul-ii', 'apost_exhortations', 'hf_jp-ii_exh_02121984_reconciliatio-et-paenitentia'), articles: 35 },
	{ slug: 'dominum-et-vivificantem', title: 'Dominum et vivificantem', kind: 'encyclical', author: 'john-paul-ii', date: '1986-05-18', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_18051986_dominum-et-vivificantem'), articles: 67 },
	{ slug: 'sollicitudo-rei-socialis', title: 'Sollicitudo rei socialis', kind: 'encyclical', author: 'john-paul-ii', date: '1987-12-30', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_30121987_sollicitudo-rei-socialis'), articles: 49 },
	{ slug: 'mulieris-dignitatem', title: 'Mulieris dignitatem', kind: 'letter', author: 'john-paul-ii', date: '1988-08-15', where: { at: 'letter', pope: 'john-paul-ii', year: 1988, file: 'hf_jp-ii_apl_19880815_mulieris-dignitatem' }, articles: 31 },
	{ slug: 'christifideles-laici', title: 'Christifideles laici', kind: 'exhortation', author: 'john-paul-ii', date: '1988-12-30', where: pope('john-paul-ii', 'apost_exhortations', 'hf_jp-ii_exh_30121988_christifideles-laici'), articles: 64 },
	{ slug: 'redemptoris-missio', title: 'Redemptoris missio', kind: 'encyclical', author: 'john-paul-ii', date: '1990-12-07', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_07121990_redemptoris-missio'), articles: 92 },
	{ slug: 'centesimus-annus', title: 'Centesimus annus', kind: 'encyclical', author: 'john-paul-ii', date: '1991-05-01', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_01051991_centesimus-annus'), articles: 62 },
	{ slug: 'veritatis-splendor', title: 'Veritatis splendor', kind: 'encyclical', author: 'john-paul-ii', date: '1993-08-06', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_06081993_veritatis-splendor'), articles: 120 },
	{ slug: 'ordinatio-sacerdotalis', title: 'Ordinatio sacerdotalis', kind: 'letter', author: 'john-paul-ii', date: '1994-05-22', where: { at: 'letter', pope: 'john-paul-ii', year: 1994, file: 'hf_jp-ii_apl_19940522_ordinatio-sacerdotalis' }, articles: 4 },
	{ slug: 'evangelium-vitae', title: 'Evangelium vitae', kind: 'encyclical', author: 'john-paul-ii', date: '1995-03-25', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_25031995_evangelium-vitae'), articles: 105 },
	{ slug: 'ut-unum-sint', title: 'Ut unum sint', kind: 'encyclical', author: 'john-paul-ii', date: '1995-05-25', where: pope('john-paul-ii', 'encyclicals', 'hf_jp-ii_enc_25051995_ut-unum-sint'), articles: 103, skip: { la: 'the Latin on vatican.va breaks off at article 23 of 103' } },
	{ slug: 'vita-consecrata', title: 'Vita consecrata', kind: 'exhortation', author: 'john-paul-ii', date: '1996-03-25', where: pope('john-paul-ii', 'apost_exhortations', 'hf_jp-ii_exh_25031996_vita-consecrata'), articles: 112 },

	// ---- Congregation for the Doctrine of the Faith (English and Latin; the
	//      German translations are not on vatican.va) ----
	{ slug: 'mysterium-ecclesiae', title: 'Mysterium Ecclesiae', kind: 'declaration', author: 'cdf', date: '1973-06-24', where: { at: 'cdf', file: 'rc_con_cfaith_doc_19730705_mysterium-ecclesiae' }, articles: 6 },
	{ slug: 'persona-humana', title: 'Persona humana', kind: 'declaration', author: 'cdf', date: '1975-12-29', where: { at: 'cdf', file: 'rc_con_cfaith_doc_19751229_persona-humana' }, articles: 13, skip: { de: 'the translation prints no article numbers at all', en: 'the translation prints no article numbers at all' } },
	{ slug: 'inter-insigniores', title: 'Inter insigniores', kind: 'declaration', author: 'cdf', date: '1976-10-15', where: { at: 'cdf', file: 'rc_con_cfaith_doc_19761015_inter-insigniores' }, articles: 6 },
	{ slug: 'iura-et-bona', title: 'Iura et bona', kind: 'declaration', author: 'cdf', date: '1980-05-05', where: { at: 'cdf', file: 'rc_con_cfaith_doc_19800505_euthanasia' }, articles: 3 },
	{ slug: 'libertatis-conscientia', title: 'Libertatis conscientia', kind: 'instruction', author: 'cdf', date: '1986-03-22', where: { at: 'cdf', file: 'rc_con_cfaith_doc_19860322_freedom-liberation' }, articles: 100 },
	{ slug: 'donum-vitae', title: 'Donum vitae', kind: 'instruction', author: 'cdf', date: '1987-02-22', where: { at: 'cdf', file: 'rc_con_cfaith_doc_19870222_respect-for-human-life' }, articles: 8 },

	// ---- The First Vatican Council (Latin only in the archive) ----
	{ slug: 'dei-filius', title: 'Dei Filius', kind: 'constitution', author: 'vatican-i', date: '1870-04-24', where: { at: 'vatican-i', file: 'vat-i_const_18700424_dei-filius' }, articles: 6 },
];

/**
 * The Congregation writes German `ge` and Latin `lt`. Not every document has
 * every one — `Donum vitae` has no German — and a missing one answers 404,
 * which the importer takes for the answer it is.
 */
const CDF_LANG: Record<MagisteriumLang, string> = { de: 'ge', en: 'en', la: 'lt' };

/** Where this document is published in this language, or null if it is not. */
export function magisteriumUrl(source: MagisteriumSource, lang: MagisteriumLang): string | null {
	const base = 'https://www.vatican.va';
	switch (source.where.at) {
		case 'pope':
			return `${base}/content/${source.where.pope}/${lang}/${source.where.section}/documents/${source.where.file}.html`;
		case 'letter':
			return `${base}/content/${source.where.pope}/${lang}/apost_letters/${source.where.year}/documents/${source.where.file}.html`;
		case 'cdf':
			return `${base}/roman_curia/congregations/cfaith/documents/${source.where.file}_${CDF_LANG[lang]}.html`;
		case 'vatican-i':
			return lang === 'la' ? `${base}/archive/hist_councils/i-vatican-council/documents/${source.where.file}_la.html` : null;
	}
}

/**
 * Paragraph 2267 as Pope Francis promulgated it on 2 August 2018.
 *
 * Every free edition of the Catechism online — the Vatican's own German,
 * English and Latin conversions included — was made from the 1997 editio typica
 * and still prints the superseded text on the death penalty. The importer
 * replaces it with this one, taken from the Rescriptum "ex Audientia SS.mi"
 * published in the Holy See Press Office bulletin B0556 of 02.08.2018:
 * https://press.vatican.va/content/salastampa/it/bollettino/pubblico/2018/08/02/0556/01209.html
 *
 * `{{fn}}` is where the footnote marker goes; the importer numbers it into
 * whatever the surrounding section already uses.
 */
import type { CccLang } from '../../src/lib/faith/cccTypes';

export type Revision = {
	/** ISO date of the revision, shown by the reader beside the paragraph. */
	on: string;
	html: string;
	note: string;
};

export const REVISED_2267: Record<CccLang, Revision> = {
	de: {
		on: '2018-08-02',
		html:
			'Lange Zeit wurde der Rückgriff auf die Todesstrafe durch die rechtmäßige Autorität – nach einem ordentlichen Gerichtsverfahren – als eine angemessene Antwort auf die Schwere einiger Verbrechen und als ein annehmbares, wenn auch extremes Mittel zur Wahrung des Gemeinwohls angesehen. ' + // ß-ok: the promulgated German text, quoted as printed
			'Heute gibt es ein wachsendes Bewusstsein dafür, dass die Würde der Person auch dann nicht verloren geht, wenn jemand schwerste Verbrechen begangen hat. Hinzu kommt, dass sich ein neues Verständnis vom Sinn der Strafsanktionen durch den Staat verbreitet hat. Schließlich wurden wirksamere Haftsysteme entwickelt, welche die pflichtgemäße Verteidigung der Bürger garantieren, zugleich aber dem Täter nicht endgültig die Möglichkeit der Besserung nehmen. ' + // ß-ok: the promulgated German text, quoted as printed
			'Deshalb lehrt die Kirche im Licht des Evangeliums, dass „die Todesstrafe unzulässig ist, weil sie gegen die Unantastbarkeit und Würde der Person verstößt“{{fn}}, und setzt sich mit Entschiedenheit für deren Abschaffung in der ganzen Welt ein.', // ß-ok: the promulgated German text, quoted as printed
		note: 'Papst Franziskus, <em>Ansprache zum 25. Jahrestag der Veröffentlichung des Katechismus der Katholischen Kirche</em>, 11. Oktober 2017 (<em>L’Osservatore Romano</em>, 13. Oktober 2017, 5).'
	},
	en: {
		on: '2018-08-02',
		html:
			'Recourse to the death penalty on the part of legitimate authority, following a fair trial, was long considered an appropriate response to the gravity of certain crimes and an acceptable, albeit extreme, means of safeguarding the common good. ' +
			'Today, however, there is an increasing awareness that the dignity of the person is not lost even after the commission of very serious crimes. In addition, a new understanding has emerged of the significance of penal sanctions imposed by the state. Lastly, more effective systems of detention have been developed, which ensure the due protection of citizens but, at the same time, do not definitively deprive the guilty of the possibility of redemption. ' +
			'Consequently, the Church teaches, in the light of the Gospel, that “the death penalty is inadmissible because it is an attack on the inviolability and dignity of the person”{{fn}}, and she works with determination for its abolition worldwide.',
		note: 'Francis, <em>Address to Participants in the Meeting organized by the Pontifical Council for the Promotion of the New Evangelization</em>, 11 October 2017: <em>L’Osservatore Romano</em>, 13 October 2017, 5.'
	},
	la: {
		on: '2018-08-02',
		html:
			'Quod auctoritas legitima, processu ordinario peracto, recurrere posset ad poenam mortis, diu habitum est utpote responsum nonnullorum delictorum gravitati aptum instrumentumque idoneum, quamvis extremum, ad bonum commune tuendum. ' +
			'His autem temporibus magis magisque agnoscitur dignitatem personae nullius amitti posse, nec quidem illius qui scelera fecit gravissima. Novus insuper sanctionis poenalis sensus, quoad Statum attinet, magis in dies percipitur. Denique rationes efficientioris custodiae excogitatae sunt quae in tuto collocent debitam civium defensionem, verum nullo modo imminuant reorum potestatem sui ipsius redimendi. ' +
			'Quapropter Ecclesia, sub Evangelii luce, docet “poenam capitalem non posse admitti quippe quae repugnet inviolabili personae humanae dignitati”{{fn}} atque Ipsa devovet se eidemque per omnem orbem abolendae.',
		note: 'Franciscus, <em>Sermo ad participantes conventum a Pontificio Consilio de Nova Evangelizatione Promovenda provectum</em> (die XI mensis Octobris anno MMXVII): <em>L’Osservatore Romano</em> (die XIII mensis Octobris anno MMXVII), 5.'
	}
};

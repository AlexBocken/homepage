/**
 * The abbreviations the Catechism's editions use for papal documents.
 *
 * The council has one set of abbreviations that everybody uses; these do not,
 * and the Catechism prints them anyway — "Vgl. CA 32", "Cf. FC 19". They are
 * the *commonest* form in the German and English editions, so leaving them out
 * would mean linking the minority of citations:
 *
 *     de   CA 32 · FC 26 · CT 13 · RM 11 · SRS 11 · RP 6 · EN 6 · HV 6 · LE 6 …
 *     en   CA 30 · FC 25 · CT 17 · SRS 10 · RP 6 · EN 6 · HV 6 · LE 6 · MD 4 …
 *     la   CA 10
 *
 * Matching is case-sensitive on purpose: `MC` is Marialis cultus, `Mc` is the
 * Gospel of Mark, and the Latin edition writes both.
 */
export const MAGISTERIUM_ABBR: Record<string, string> = {
	CA: 'centesimus-annus',
	FC: 'familiaris-consortio',
	CT: 'catechesi-tradendae',
	RM: 'redemptoris-missio',
	RMi: 'redemptoris-missio',
	SRS: 'sollicitudo-rei-socialis',
	RP: 'reconciliatio-et-paenitentia',
	EN: 'evangelii-nuntiandi',
	HV: 'humanae-vitae',
	LE: 'laborem-exercens',
	MD: 'mulieris-dignitatem',
	DeV: 'dominum-et-vivificantem',
	PT: 'pacem-in-terris',
	RH: 'redemptor-hominis',
	MC: 'marialis-cultus',
	PP: 'populorum-progressio',
	MM: 'mater-et-magistra',
	DM: 'dives-in-misericordia',
	ChL: 'christifideles-laici',
	VS: 'veritatis-splendor',
	EV: 'evangelium-vitae',
	UUS: 'ut-unum-sint'
};

/**
 * The commentators the Bible reader knows by name: the Church Fathers, the
 * medieval doctors and glossators, and the modern Catholic commentators the
 * corpora carry. Curated records give names in both languages, the year of
 * death, and, for the great ones, a portrait; every other author the import
 * meets is derived from the source's own name and date (`derivedFather`).
 *
 * Groups decide what the reader shows by default: fathers and medievals are
 * on, moderns (Haydock, a Lapide, Challoner …) are a setting.
 */
export type FatherGroup = 'father' | 'medieval' | 'modern';

export type Portrait = {
	/** File under static/glaube/fathers/, the original the crops are cut from. */
	file: string;
	artist: string;
	title: string;
	year: string;
	/** The face's centre as fractions of width and height. */
	focus: [number, number];
	/** Side of the square crop as a fraction of the shorter image side (default 0.6). */
	zoom?: number;
};

export type Father = {
	id: string;
	name: { en: string; de: string };
	/** Canonised: the label gets "Hl." / "St". */
	saint?: boolean;
	/** Year of death, when known. */
	died: number | null;
	group: FatherGroup;
	/** Spellings the sources use, matched case-insensitively without dots. */
	aliases: string[];
	portrait?: Portrait;
};

/** Fathers up to the death of Bede, medievals to 1500, moderns after. */
export function groupFor(died: number | null): FatherGroup {
	if (died === null) return 'father';
	if (died <= 750) return 'father';
	if (died <= 1500) return 'medieval';
	return 'modern';
}

const f = (id: string, en: string, de: string, died: number | null, aliases: string[], opts: { saint?: boolean; group?: FatherGroup; portrait?: Portrait } = {}): Father => ({
	id,
	name: { en, de },
	saint: opts.saint,
	died,
	group: opts.group ?? groupFor(died),
	aliases,
	portrait: opts.portrait
});

const p = (file: string, artist: string, title: string, year: string, focus: [number, number], zoom?: number): Portrait => ({ file, artist, title, year, focus, zoom });

export const FATHERS: Father[] = [
	f('chrysostom', 'John Chrysostom', 'Johannes Chrysostomus', 407, ['John Chrysostom', 'Chrysostom', 'Chrys.', 'CHRSSTM'], { saint: true, portrait: p('chrysostom.jpg', 'Byzantine mosaic', 'Saint John Chrysostom, north tympanum of Hagia Sophia', '9th century', [0.5, 0.22], 0.45) }),
	f('augustine', 'Augustine of Hippo', 'Augustinus von Hippo', 430, ['Augustine of Hippo', 'Augustine', 'Aug.', 'AGSTN'], { saint: true, portrait: p('augustine.jpg', 'Philippe de Champaigne', 'Saint Augustine', 'c. 1645–1650', [0.62, 0.17], 0.32) }),
	f('jerome', 'Jerome', 'Hieronymus', 420, ['Jerome', 'Hieronymus', 'JRM'], { saint: true, portrait: p('jerome.jpg', 'Caravaggio', 'Saint Jerome Writing', '1605–1606', [0.8, 0.27], 0.36) }),
	f('ambrose', 'Ambrose of Milan', 'Ambrosius von Mailand', 397, ['Ambrose of Milan', 'Ambrose', 'AMBRS'], { saint: true, portrait: p('ambrose.jpg', 'Mosaic', 'Saint Ambrose, chapel of San Vittore in Ciel d’Oro, Milan', '5th century', [0.5, 0.3], 0.5) }),
	f('gregory-great', 'Gregory the Great', 'Gregor der Grosse', 604, ['Gregory the Great', 'Gregory The Dialogist', 'Gregory', 'Greg.', 'GTD'], { saint: true, portrait: p('gregory-great.jpg', 'Antonello da Messina', 'Saint Gregory the Great', '1472–1473', [0.5, 0.36], 0.5) }),
	f('bede', 'Bede', 'Beda Venerabilis', 735, ['Bede', 'Venerable Bede', 'BDE'], { saint: true, portrait: p('bede.jpg', 'James Doyle Penrose', 'The Last Chapter', '1902', [0.5, 0.32], 0.5) }),
	f('origen', 'Origen', 'Origenes', 253, ['Origen', 'Origen of Alexandria', 'ORGN'], { portrait: p('origen.jpg', 'André Thevet', 'Origène, from Les vrais pourtraits et vies des hommes illustres', '1584', [0.5, 0.3], 0.55) }),
	f('cyril-alexandria', 'Cyril of Alexandria', 'Kyrill von Alexandrien', 444, ['Cyril of Alexandria', 'Cyril', 'CRL'], { saint: true }),
	f('basil', 'Basil the Great', 'Basilius der Grosse', 379, ['Basil the Great', 'Basil', 'BSL'], { saint: true, portrait: p('basil.jpg', 'Mosaic', 'Saint Basil the Great, Palatine Chapel, Palermo', '12th century', [0.5, 0.28], 0.45) }),
	f('gregory-nazianzen', 'Gregory Nazianzen', 'Gregor von Nazianz', 390, ['Gregory Nazianzen', 'Gregory the Theologian', 'Gregory of Nazianzus', 'Naz.', 'GN2'], { saint: true, portrait: p('gregory-nazianzen.jpg', 'Byzantine mosaic', 'Saint Gregory the Theologian, Chora Church, Constantinople', '14th century', [0.66, 0.28], 0.3) }),
	f('gregory-nyssa', 'Gregory of Nyssa', 'Gregor von Nyssa', 394, ['Gregory of Nyssa', 'Nyssen', 'GON'], { saint: true, portrait: p('gregory-nyssa.jpg', 'Mosaic', 'Saint Gregory of Nyssa, Saint Sophia Cathedral, Kiev', '11th century', [0.5, 0.3], 0.5) }),
	f('athanasius', 'Athanasius of Alexandria', 'Athanasius von Alexandrien', 373, ['Athanasius the Apostolic', 'Athanasius', 'ATHNSS'], { saint: true, portrait: p('athanasius.jpg', 'Icon', 'Saint Athanasius of Alexandria', '17th century', [0.5, 0.28], 0.5) }),
	f('cyril-jerusalem', 'Cyril of Jerusalem', 'Kyrill von Jerusalem', 386, ['Cyril of Jerusalem', 'COJ'], { saint: true }),
	f('ephrem', 'Ephrem the Syrian', 'Ephräm der Syrer', 373, ['Ephrem The Syrian', 'Ephrem', 'Ephraim', 'ETS'], { saint: true }),
	f('hilary', 'Hilary of Poitiers', 'Hilarius von Poitiers', 368, ['Hilary of Poitiers', 'Hilary', 'Hil.', 'HLR'], { saint: true }),
	f('tertullian', 'Tertullian', 'Tertullian', 220, ['Tertullian of Carthage', 'Tertullian', 'TN'], { portrait: p('tertullian.jpg', 'André Thevet', 'Tertullien, from Les vrais pourtraits et vies des hommes illustres', '1584', [0.5, 0.3], 0.55) }),
	f('cyprian', 'Cyprian of Carthage', 'Cyprian von Karthago', 258, ['Cyprian of Carthage', 'Cyprian', 'CPRN'], { saint: true }),
	f('irenaeus', 'Irenaeus of Lyons', 'Irenäus von Lyon', 202, ['Irenaeus of Lyons', 'Irenaeus', 'IA'], { saint: true }),
	f('clement-alexandria', 'Clement of Alexandria', 'Clemens von Alexandrien', 215, ['Clement Of Alexandria', 'Clement of Alexandria', 'COA'], { portrait: p('clement-alexandria.jpg', 'André Thevet', 'Clément d’Alexandrie, from Les vrais pourtraits et vies des hommes illustres', '1584', [0.5, 0.3], 0.55) }),
	f('clement-rome', 'Clement of Rome', 'Clemens von Rom', 99, ['Clement Of Rome', 'Clement of Rome', 'COR'], { saint: true }),
	f('ignatius', 'Ignatius of Antioch', 'Ignatius von Antiochien', 108, ['Ignatius of Antioch', 'Ignatius', 'IS'], { saint: true }),
	f('hippolytus', 'Hippolytus of Rome', 'Hippolyt von Rom', 235, ['Hippolytus of Rome', 'Hippolytus', 'HS'], { saint: true }),
	f('justin', 'Justin Martyr', 'Justin der Märtyrer', 165, ['Justin Martyr', 'Justin', 'JT'], { saint: true }),
	f('leo-great', 'Leo the Great', 'Leo der Grosse', 461, ['Leo of Rome', 'Leo the Great', 'Leo', 'LEO'], { saint: true, portrait: p('leo-great.jpg', 'Francisco Herrera the Younger', 'Saint Leo the Great', 'c. 1650', [0.5, 0.3], 0.45) }),
	f('john-damascene', 'John of Damascus', 'Johannes von Damaskus', 749, ['John of Damascus', 'John Damascene', 'Damascene', 'DE'], { saint: true }),
	f('cassian', 'John Cassian', 'Johannes Cassian', 435, ['John Cassian', 'Cassian', 'JNCN'], { saint: true }),
	f('eusebius', 'Eusebius of Caesarea', 'Eusebius von Caesarea', 339, ['Eusebius of Caesarea', 'Eusebius', 'ESBS']),
	f('chrysologus', 'Peter Chrysologus', 'Petrus Chrysologus', 450, ['Peter Chrysologus', 'Chrysologus', 'CHRSLGS'], { saint: true }),
	f('theophylact', 'Theophylact of Ochrid', 'Theophylakt von Ochrid', 1107, ['Theophylact of Ochrid', 'Theophylact', 'Theoph.', 'THPHLCT']),
	f('rabanus', 'Rabanus Maurus', 'Hrabanus Maurus', 856, ['Rabanus Maurus', 'Rabanus', 'Raban.', 'RBNS']),
	f('alcuin', 'Alcuin of York', 'Alkuin von York', 804, ['Alcuin of York', 'Alcuin', 'ALCN']),
	f('remigius', 'Remigius of Auxerre', 'Remigius von Auxerre', 908, ['Remigius of Rheims', 'Remigius', 'Remig.', 'RMGS']),
	f('haimo', 'Haimo of Auxerre', 'Haimo von Auxerre', 865, ['Haimo of Auxerre', 'Haymo', 'Haymo of Faversham', 'HOA', 'HYM']),
	f('lactantius', 'Lactantius', 'Laktanz', 320, ['Lucius Caecilius Firmianus Lactantius', 'Lactantius', 'LS']),
	f('anselm', 'Anselm of Canterbury', 'Anselm von Canterbury', 1109, ['Anselm'], { saint: true }),
	f('bernard', 'Bernard of Clairvaux', 'Bernhard von Clairvaux', 1153, ['Bernard of Clairvaux', 'Bernard', 'BOC'], { saint: true }),
	f('aquinas', 'Thomas Aquinas', 'Thomas von Aquin', 1274, ['Thomas Aquinas', 'Aquinas', 'TA'], { saint: true, portrait: p('aquinas.jpg', 'Carlo Crivelli', 'Saint Thomas Aquinas', '1476', [0.5, 0.3], 0.5) }),
	f('glossa', 'Glossa Ordinaria', 'Glossa ordinaria', 1480, ['Glossa Ordinaria', 'Gloss', 'Gloss.', 'GLSS', 'Interlinear Gloss', 'IG'], { group: 'medieval' }),
	f('lapide', 'Cornelius a Lapide', 'Cornelius a Lapide', 1637, ['Cornelius a Lapide', 'Lapide', 'CAL'], { portrait: p('lapide.jpg', 'Engraving', 'Cornelius a Lapide', '17th century', [0.42, 0.3], 0.5) }),
	f('haydock', 'George Leo Haydock', 'George Leo Haydock', 1849, ['George Leo Haydock', 'Haydock', 'HDCK']),
	f('challoner', 'Richard Challoner', 'Richard Challoner', 1781, ['Richard Challoner', 'Challoner', 'RDCR']),
	f('douay-1609', 'Douay-Rheims 1609 annotators', 'Anmerkungen der Douay-Rheims 1609', 1609, ['Douay Rheims 1609', 'DR16']),
	f('aquinas-study-bible', 'Aquinas Study Bible', 'Aquinas Study Bible', 2017, ['Aquinas Study Bible', 'ASB']),
	f('erasmus', 'Erasmus of Rotterdam', 'Erasmus von Rotterdam', 1536, ['Erasmus of Rotterdam', 'Erasmus', 'DSES']),
	f('pseudo-chrysostom', 'Pseudo-Chrysostom', 'Pseudo-Chrysostomus', null, ['Pseudo-Chrysostom', 'Pseudo-Chrys.']),
	f('pseudo-augustine', 'Pseudo-Augustine', 'Pseudo-Augustinus', null, ['Pseudo-Augustine', 'PAGSTN']),
	f('pseudo-jerome', 'Pseudo-Jerome', 'Pseudo-Hieronymus', null, ['Pseudo-Jerome']),
	f('ambrosiaster', 'Ambrosiaster', 'Ambrosiaster', 400, ['Ambrosiaster', 'AMBSTR']),
	f('greek-expositor', 'A Greek expositor', 'Ein griechischer Ausleger', null, ['A Greek expositor', 'Greek Expositor', 'GE'])
];

const norm = (s: string) => s.toLowerCase().replace(/^(saint|st\.?|hl\.?)\s+/, '').replace(/[.\s’'-]/g, '');
const BY_ALIAS = new Map<string, Father>();
for (const fa of FATHERS) for (const a of [fa.id, fa.name.en, fa.name.de, ...fa.aliases]) BY_ALIAS.set(norm(a), fa);
const BY_ID = new Map(FATHERS.map((fa) => [fa.id, fa]));

export function fatherById(id: string): Father | null {
	return BY_ID.get(id) ?? null;
}
export function findFather(nameOrId: string): Father | null {
	return BY_ALIAS.get(norm(nameOrId)) ?? null;
}

/** An author the registry does not know, from the source's name and date. */
export function derivedFather(name: string, died: number | null): Father {
	const id = name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 48);
	return { id, name: { en: name, de: name }, died, group: groupFor(died), aliases: [name] };
}

/** "Hl. Augustinus von Hippo" / "St Augustine of Hippo" / the plain name. */
export function fatherLabel(fa: Pick<Father, 'name' | 'saint'>, lang: 'de' | 'en' | 'la'): string {
	const name = lang === 'de' ? fa.name.de : fa.name.en;
	if (!fa.saint) return name;
	return lang === 'de' ? `Hl. ${name}` : lang === 'la' ? `S. ${name}` : `St ${name}`;
}

/** Two letters for the disc when there is no portrait. */
export function fatherInitials(name: string): string {
	const words = name.replace(/^(Pseudo-|The |A )/, '').split(/[\s-]+/).filter((w) => /^[A-Za-zÀ-ž]/.test(w));
	const stop = new Set(['of', 'the', 'von', 'der', 'a', 'de']);
	const main = words.filter((w) => !stop.has(w.toLowerCase()));
	return (main.length >= 2 ? main[0][0] + main[1][0] : (main[0] ?? '?').slice(0, 2)).toUpperCase();
}

export const PORTRAIT_SIZES = [48, 96, 192] as const;
export const portraitUrl = (id: string, size: (typeof PORTRAIT_SIZES)[number]) => `/glaube/fathers/${id}-${size}.webp`;

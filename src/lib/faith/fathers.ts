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
	/**
	 * A renowned commentator, the ones a Catholic reader would expect to find:
	 * the Doctors of the Church, the Apostolic Fathers, the classic exegetes
	 * and the standard medieval and modern commentaries. Everyone else is a
	 * "minor voice": listed apart on the index, and hidden by the reader's
	 * presets unless the reader asks for them. Derived authors are never major.
	 */
	major?: boolean;
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
	portrait: opts.portrait,
	major: MAJOR.has(id)
});

/** See `Father.major`. Kept as a list so the ranking is readable in one place. */
const MAJOR = new Set([
	// The great Latin and Greek Doctors and the classic exegetes.
	'augustine', 'jerome', 'chrysostom', 'ambrose', 'gregory-great', 'bede', 'origen', 'cyril-alexandria', 'basil', 'gregory-nazianzen', 'gregory-nyssa', 'athanasius', 'cyril-jerusalem', 'ephrem', 'hilary', 'leo-great', 'john-damascene', 'chrysologus', 'isodore-of-seville',
	// The Apostolic Fathers and the earliest witnesses.
	'clement-rome', 'ignatius', 'polycarp-of-smyrna', 'justin', 'irenaeus', 'tertullian', 'cyprian', 'clement-alexandria', 'eusebius', 'cassian',
	// The medieval school and the standard modern commentaries.
	'theophylact', 'rabanus', 'anselm', 'bernard', 'aquinas', 'glossa', 'nicholas-of-lyra', 'lapide', 'haydock', 'challoner'
]);

const p = (file: string, artist: string, title: string, year: string, focus: [number, number], zoom?: number): Portrait => ({ file, artist, title, year, focus, zoom });

export const FATHERS: Father[] = [
	f('chrysostom', 'John Chrysostom', 'Johannes Chrysostomus', 407, ['John Chrysostom', 'Chrysostom', 'Chrys.', 'CHRSSTM'], { saint: true, portrait: p('chrysostom.jpg', 'Byzantine mosaic', 'Saint John Chrysostom, north tympanum of Hagia Sophia', '9th century', [0.5, 0.22], 0.45) }),
	f('augustine', 'Augustine of Hippo', 'Augustinus von Hippo', 430, ['Augustine of Hippo', 'Augustine', 'Aug.', 'AGSTN'], { saint: true, portrait: p('augustine.jpg', 'Philippe de Champaigne', 'Saint Augustine', 'c. 1645–1650', [0.62, 0.17], 0.32) }),
	f('jerome', 'Jerome', 'Hieronymus', 420, ['Jerome', 'Hieronymus', 'JRM'], { saint: true, portrait: p('jerome.jpg', 'Caravaggio', 'Saint Jerome Writing', '1605–1606', [0.8, 0.27], 0.36) }),
	f('ambrose', 'Ambrose of Milan', 'Ambrosius von Mailand', 397, ['Ambrose of Milan', 'Ambrose', 'AMBRS'], { saint: true, portrait: p('ambrose.jpg', 'Mosaic', 'Saint Ambrose, chapel of San Vittore in Ciel d’Oro, Milan', '5th century', [0.5, 0.3], 0.5) }),
	f('gregory-great', 'Gregory the Great', 'Gregor der Grosse', 604, ['Gregory the Great', 'Gregory The Dialogist', 'Gregory', 'Greg.', 'GTD'], { saint: true, portrait: p('gregory-great.jpg', 'Antonello da Messina', 'Saint Gregory the Great', '1472–1473', [0.5, 0.36], 0.5) }),
	f('bede', 'Bede', 'Beda Venerabilis', 735, ['Bede', 'Venerable Bede', 'BDE'], { saint: true, portrait: p('bede.jpg', 'James Doyle Penrose', 'The Last Chapter', '1902', [0.5, 0.32], 0.5) }),
	f('origen', 'Origen', 'Origenes', 253, ['Origen', 'Origen of Alexandria', 'ORGN'], { portrait: p('origen.jpg', 'André Thevet', 'Origène, from Les vrais pourtraits et vies des hommes illustres', '1584', [0.5, 0.3], 0.55) }),
	f('cyril-alexandria', 'Cyril of Alexandria', 'Kyrill von Alexandrien', 444, ['Cyril of Alexandria', 'Cyril', 'CRL'], { saint: true, portrait: p('cyril-alexandria.jpg', 'Icon', 'Saint Cyril of Alexandria, Orthodox Cathedral of Saint George', 'undated', [0.57, 0.28], 0.35) }),
	f('basil', 'Basil the Great', 'Basilius der Grosse', 379, ['Basil the Great', 'Basil', 'BSL'], { saint: true, portrait: p('basil.jpg', 'Mosaic', 'Saint Basil the Great, Palatine Chapel, Palermo', '12th century', [0.5, 0.28], 0.45) }),
	f('gregory-nazianzen', 'Gregory Nazianzen', 'Gregor von Nazianz', 390, ['Gregory Nazianzen', 'Gregory the Theologian', 'Gregory of Nazianzus', 'Naz.', 'GN2'], { saint: true, portrait: p('gregory-nazianzen.jpg', 'Byzantine mosaic', 'Saint Gregory the Theologian, Chora Church, Constantinople', '14th century', [0.66, 0.28], 0.3) }),
	f('gregory-nyssa', 'Gregory of Nyssa', 'Gregor von Nyssa', 394, ['Gregory of Nyssa', 'Nyssen', 'GON'], { saint: true, portrait: p('gregory-nyssa.jpg', 'Mosaic', 'Saint Gregory of Nyssa, Saint Sophia Cathedral, Kiev', '11th century', [0.5, 0.3], 0.5) }),
	f('athanasius', 'Athanasius of Alexandria', 'Athanasius von Alexandrien', 373, ['Athanasius the Apostolic', 'Athanasius', 'ATHNSS'], { saint: true, portrait: p('athanasius.jpg', 'Icon', 'Saint Athanasius of Alexandria', '17th century', [0.5, 0.28], 0.5) }),
	f('cyril-jerusalem', 'Cyril of Jerusalem', 'Kyrill von Jerusalem', 386, ['Cyril of Jerusalem', 'COJ'], { saint: true, portrait: p('cyril-jerusalem.jpg', 'Fresco', 'Saint Cyril of Jerusalem', '14th century', [0.5, 0.3], 0.5) }),
	f('ephrem', 'Ephrem the Syrian', 'Ephräm der Syrer', 373, ['Ephrem The Syrian', 'Ephrem', 'Ephraim', 'ETS'], { saint: true, portrait: p('ephrem.jpg', 'Mosaic', 'Saint Ephrem the Syrian, Nea Moni, Chios', '11th century', [0.5, 0.35], 0.5) }),
	f('hilary', 'Hilary of Poitiers', 'Hilarius von Poitiers', 368, ['Hilary of Poitiers', 'Hilary', 'Hil.', 'HLR'], { saint: true, portrait: p('hilary.png', 'Icon (PravoslavnyChristianin, CC0)', 'Saint Hilary of Poitiers', '2013', [0.5, 0.25], 0.5) }),
	f('tertullian', 'Tertullian', 'Tertullian', 220, ['Tertullian of Carthage', 'Tertullian', 'TN'], { portrait: p('tertullian.jpg', 'André Thevet', 'Tertullien, from Les vrais pourtraits et vies des hommes illustres', '1584', [0.5, 0.3], 0.55) }),
	f('cyprian', 'Cyprian of Carthage', 'Cyprian von Karthago', 258, ['Cyprian of Carthage', 'Cyprian', 'CPRN'], { saint: true, portrait: p('cyprian.jpg', 'Russian icon', 'Saint Cyprian of Carthage', 'undated', [0.5, 0.25], 0.6) }),
	f('irenaeus', 'Irenaeus of Lyons', 'Irenäus von Lyon', 202, ['Irenaeus of Lyons', 'Irenaeus', 'IA'], { saint: true, portrait: p('irenaeus.jpg', 'Engraving', 'Saint Irenaeus of Lyons', 'undated', [0.5, 0.3], 0.6) }),
	f('clement-alexandria', 'Clement of Alexandria', 'Clemens von Alexandrien', 215, ['Clement Of Alexandria', 'Clement of Alexandria', 'COA'], { portrait: p('clement-alexandria.jpg', 'André Thevet', 'Clément d’Alexandrie, from Les vrais pourtraits et vies des hommes illustres', '1584', [0.5, 0.3], 0.55) }),
	f('clement-rome', 'Clement of Rome', 'Clemens von Rom', 99, ['Clement Of Rome', 'Clement of Rome', 'COR'], { saint: true, portrait: p('clement-rome.jpg', 'Mosaic', 'Saint Clement of Rome, Saint Sophia Cathedral, Kiev', '11th century', [0.5, 0.25], 0.55) }),
	f('ignatius', 'Ignatius of Antioch', 'Ignatius von Antiochien', 108, ['Ignatius of Antioch', 'Ignatius', 'IS'], { saint: true, portrait: p('ignatius.jpg', 'Menologion of Basil II', 'The martyrdom of Saint Ignatius of Antioch', 'c. 985', [0.55, 0.5], 0.14) }),
	f('hippolytus', 'Hippolytus of Rome', 'Hippolyt von Rom', 235, ['Hippolytus of Rome', 'Hippolytus', 'HS'], { saint: true, portrait: p('hippolytus.jpg', 'Fresco', 'Saint Hippolytus of Rome', '14th–15th century', [0.47, 0.28], 0.55) }),
	f('justin', 'Justin Martyr', 'Justin der Märtyrer', 165, ['Justin Martyr', 'Justin', 'JT'], { saint: true, portrait: p('justin.jpg', 'André Thevet', 'Justin, from Les vrais pourtraits et vies des hommes illustres', '1584', [0.5, 0.2], 0.4) }),
	f('leo-great', 'Leo the Great', 'Leo der Grosse', 461, ['Leo of Rome', 'Leo the Great', 'Leo', 'LEO'], { saint: true, portrait: p('leo-great.jpg', 'Francisco Herrera the Younger', 'Saint Leo the Great', 'c. 1650', [0.5, 0.3], 0.45) }),
	f('john-damascene', 'John of Damascus', 'Johannes von Damaskus', 749, ['John of Damascus', 'John Damascene', 'Damascene', 'DE'], { saint: true, portrait: p('john-damascene.jpg', 'Emmanuel Tzanes', 'Saint John of Damascus', '17th century', [0.5, 0.12], 0.45) }),
	f('cassian', 'John Cassian', 'Johannes Cassian', 435, ['John Cassian', 'Cassian', 'JNCN'], { saint: true, portrait: p('cassian.jpg', 'Icon', 'Saint John Cassian', 'undated', [0.5, 0.2], 0.35) }),
	f('eusebius', 'Eusebius of Caesarea', 'Eusebius von Caesarea', 339, ['Eusebius of Caesarea', 'Eusebius', 'ESBS'], { portrait: p('eusebius.jpg', 'Engraving', 'Eusebius of Caesarea', 'undated', [0.52, 0.22], 0.45) }),
	f('chrysologus', 'Peter Chrysologus', 'Petrus Chrysologus', 450, ['Peter Chrysologus', 'Chrysologus', 'CHRSLGS'], { saint: true, portrait: p('chrysologus.jpg', 'School of Guercino', 'Saint Peter Chrysologus', '17th century', [0.55, 0.32], 0.28) }),
	f('theophylact', 'Theophylact of Ochrid', 'Theophylakt von Ochrid', 1107, ['Theophylact of Ochrid', 'Theophylact', 'Theoph.', 'THPHLCT'], { portrait: p('theophylact.jpg', 'Icon', 'Saint Theophylact of Ochrid', '17th century', [0.5, 0.11], 0.3) }),
	f('rabanus', 'Rabanus Maurus', 'Hrabanus Maurus', 856, ['Rabanus Maurus', 'Rabanus', 'Raban.', 'RBNS'], { portrait: p('rabanus-alcuin.jpg', 'Fulda manuscript', 'Rabanus Maurus, supported by Alcuin, presents his work to Otgar of Mainz', 'c. 831–840', [0.245, 0.34], 0.2) }),
	f('alcuin', 'Alcuin of York', 'Alkuin von York', 804, ['Alcuin of York', 'Alcuin', 'ALCN'], { portrait: p('rabanus-alcuin.jpg', 'Fulda manuscript', 'Rabanus Maurus, supported by Alcuin, presents his work to Otgar of Mainz', 'c. 831–840', [0.385, 0.315], 0.2) }),
	f('remigius', 'Remigius of Auxerre', 'Remigius von Auxerre', 908, ['Remigius of Rheims', 'Remigius', 'Remig.', 'RMGS']),
	f('haimo', 'Haimo of Auxerre', 'Haimo von Auxerre', 865, ['Haimo of Auxerre', 'Haymo', 'Haymo of Faversham', 'HOA', 'HYM']),
	f('lactantius', 'Lactantius', 'Laktanz', 320, ['Lucius Caecilius Firmianus Lactantius', 'Lactantius', 'LS'], { portrait: p('lactantius.jpg', 'Wall painting', 'Probable portrait of Lactantius', '4th century', [0.5, 0.35], 0.6) }),
	f('anselm', 'Anselm of Canterbury', 'Anselm von Canterbury', 1109, ['Anselm'], { saint: true, portrait: p('anselm.jpg', 'Engraving', 'Anselm of Canterbury', 'late 16th century', [0.5, 0.25], 0.5) }),
	f('bernard', 'Bernard of Clairvaux', 'Bernhard von Clairvaux', 1153, ['Bernard of Clairvaux', 'Bernard', 'BOC'], { saint: true, portrait: p('bernard.png', 'Jean le Tavernier', 'Saint Bernard of Clairvaux, book of hours', '1462', [0.54, 0.29], 0.28) }),
	f('aquinas', 'Thomas Aquinas', 'Thomas von Aquin', 1274, ['Thomas Aquinas', 'Aquinas', 'TA'], { saint: true, portrait: p('aquinas.jpg', 'Carlo Crivelli', 'Saint Thomas Aquinas', '1476', [0.5, 0.3], 0.5) }),
	f('glossa', 'Glossa Ordinaria', 'Glossa ordinaria', 1480, ['Glossa Ordinaria', 'Gloss', 'Gloss.', 'GLSS', 'Interlinear Gloss', 'IG'], { group: 'medieval' }),
	f('lapide', 'Cornelius a Lapide', 'Cornelius a Lapide', 1637, ['Cornelius a Lapide', 'Lapide', 'CAL'], { portrait: p('lapide.jpg', 'Engraving', 'Cornelius a Lapide', '17th century', [0.42, 0.3], 0.5) }),
	f('haydock', 'George Leo Haydock', 'George Leo Haydock', 1849, ['George Leo Haydock', 'Haydock', 'HDCK']),
	f('challoner', 'Richard Challoner', 'Richard Challoner', 1781, ['Richard Challoner', 'Challoner', 'RDCR'], { portrait: p('challoner.jpg', 'Painting', 'Bishop Richard Challoner', '18th century', [0.5, 0.27], 0.5) }),
	f('douay-1609', 'Douay-Rheims 1609 annotators', 'Anmerkungen der Douay-Rheims 1609', 1609, ['Douay Rheims 1609', 'DR16']),
	f('aquinas-study-bible', 'Aquinas Study Bible', 'Aquinas Study Bible', 2017, ['Aquinas Study Bible', 'ASB']),
	f('erasmus', 'Erasmus of Rotterdam', 'Erasmus von Rotterdam', 1536, ['Erasmus of Rotterdam', 'Erasmus', 'DSES'], { portrait: p('erasmus.jpg', 'Hans Holbein the Younger', 'Erasmus of Rotterdam', '1523', [0.5, 0.2], 0.35) }),
	// Promoted from the derived tail in September 2026: the ids are the ones the
	// import derived from the sources' own names, so existing URLs and the
	// collection stay valid without a re-import. Aliases carry that source name.
	f('theophilus-of-antioch', 'Theophilus of Antioch', 'Theophilus von Antiochien', 183, ['Theophilus of Antioch', 'Theophilus'], { saint: true, portrait: p('theophilus-of-antioch.jpg', 'William Cave', 'Theophilus of Antioch, from Apostolici', '1677', [0.5, 0.15], 0.25) }),
	f('polycarp-of-smyrna', 'Polycarp of Smyrna', 'Polykarp von Smyrna', 155, ['Polycarp of Smyrna', 'Polycarp'], { saint: true, portrait: p('polycarp-of-smyrna.jpg', 'Fresco', 'Saint Polycarp, church of Saint Nicholas Orphanos, Thessaloniki', '14th century', [0.5, 0.2], 0.45) }),
	f('the-didache', 'The Didache', 'Die Didache', 100, ['The Didache', 'Didache']),
	f('shepherd-of-hermas', 'The Shepherd of Hermas', 'Der Hirt des Hermas', 150, ['Shepherd of Hermas', 'The Shepherd of Hermas', 'Hermas']),
	f('victorinus-of-pettau', 'Victorinus of Pettau', 'Victorinus von Pettau', 304, ['Victorinus of Pettau', 'Victorinus of Poetovio'], { saint: true, portrait: p('victorinus-of-pettau.jpg', 'Fresco, Nova Cerkev (photo CC BY-SA 3.0)', 'Saint Victorinus of Pettau', 'undated', [0.5, 0.2], 0.35) }),
	f('methodius-of-olympus', 'Methodius of Olympus', 'Methodius von Olympos', 311, ['Methodius of Olympus', 'Methodius'], { saint: true }),
	f('aphrahat-the-persian-sage', 'Aphrahat', 'Aphrahat', 345, ['Aphrahat the Persian Sage', 'Aphrahat', 'Aphraates'], { saint: true }),
	f('gaius-marius-victorinus', 'Marius Victorinus', 'Marius Victorinus', 365, ['Gaius Marius Victorinus', 'Marius Victorinus', 'Victorinus Afer']),
	f('titus-of-bostra', 'Titus of Bostra', 'Titus von Bostra', 378, ['Titus of Bostra']),
	f('the-apostolic-constitutions', 'The Apostolic Constitutions', 'Die Apostolischen Konstitutionen', 380, ['The Apostolic Constitutions', 'Apostolic Constitutions']),
	f('diodorus-of-tarsus', 'Diodore of Tarsus', 'Diodor von Tarsus', 390, ['Diodorus of Tarsus', 'Diodore of Tarsus', 'Diodore']),
	f('pacian-of-barcelona', 'Pacian of Barcelona', 'Pacian von Barcelona', 391, ['Pacian of Barcelona', 'Pacian'], { saint: true, portrait: p('pacian-of-barcelona.jpg', 'Joan Roig (statue), photo Didier Descouens, CC BY-SA 4.0', 'Saint Pacian, Barcelona Cathedral', '17th century', [0.42, 0.3], 0.22) }),
	f('didymus-the-blind', 'Didymus the Blind', 'Didymus der Blinde', 398, ['Didymus the Blind', 'Didymus'], { portrait: p('didymus-the-blind.jpg', 'Raphael Sadeler after Maerten de Vos', 'Didymus the Blind, from Solitudo sive vitae patrum eremicolarum', 'c. 1585', [0.45, 0.27], 0.14) }),
	f('evagrius-ponticus', 'Evagrius Ponticus', 'Evagrius Ponticus', 399, ['Evagrius Ponticus', 'Evagrius'], { portrait: p('evagrius-ponticus.jpg', 'Armenian miniature', 'Evagrius Ponticus, MS 285, Armenian Patriarchate of Jerusalem', '1430', [0.5, 0.12], 0.4) }),
	f('chromatius-of-aquileia', 'Chromatius of Aquileia', 'Chromatius von Aquileia', 407, ['Chromatius of Aquileia', 'Chromatius'], { saint: true, portrait: p('chromatius-of-aquileia.jpg', 'Painting', 'Saint Chromatius, Archiepiscopal Palace, Udine', 'undated', [0.5, 0.25], 0.4) }),
	f('rufinus-of-aquileia', 'Rufinus of Aquileia', 'Rufinus von Aquileia', 411, ['Rufinus of Aquileia', 'Rufinus', 'Tyrannius Rufinus'], { portrait: p('rufinus-of-aquileia.jpg', 'Frederick Bloemaert', 'Rufinus of Aquileia', '17th century', [0.5, 0.17], 0.3) }),
	f('severian-of-gabala', 'Severian of Gabala', 'Severian von Gabala', 425, ['Severian of Gabala', 'Severian']),
	f('hesychius-of-jerusalem', 'Hesychius of Jerusalem', 'Hesychius von Jerusalem', 433, ['Hesychius of Jerusalem', 'Hesychius']),
	f('julian-of-eclanum', 'Julian of Eclanum', 'Julian von Eclanum', 455, ['Julian of Eclanum', 'Julian']),
	f('maximus-of-turin', 'Maximus of Turin', 'Maximus von Turin', 465, ['Maximus of Turin', 'Maximus'], { saint: true, portrait: p('maximus-of-turin.jpg', 'Miniature', 'Saint Maximus of Turin', 'medieval', [0.5, 0.17], 0.5) }),
	f('gennadius-of-constantinople', 'Gennadius of Constantinople', 'Gennadius von Konstantinopel', 471, ['Gennadius of Constantinople', 'Gennadius'], { portrait: p('gennadius-of-constantinople.jpg', 'Theophanes the Cretan', 'Saint Gennadius of Constantinople, Dionysiou Monastery, Athos', '1547', [0.55, 0.35], 0.6) }),
	f('salvian-the-presbyter', 'Salvian of Marseille', 'Salvian von Marseille', 480, ['Salvian the Presbyter', 'Salvian', 'Salvianus']),
	f('pseudo-dionysius-the-areopagite', 'Pseudo-Dionysius the Areopagite', 'Pseudo-Dionysius Areopagita', 520, ['Pseudo-Dionysius the Areopagite', 'Pseudo-Dionysius', 'Dionysius the Areopagite'], { portrait: p('pseudo-dionysius-the-areopagite.jpg', 'Mosaic', 'Dionysius the Areopagite, Hosios Loukas', '11th century', [0.5, 0.25], 0.35) }),
	f('fulgentius-of-ruspe', 'Fulgentius of Ruspe', 'Fulgentius von Ruspe', 533, ['Fulgentius of Ruspe', 'Fulgentius'], { saint: true, portrait: p('fulgentius-of-ruspe.jpg', 'Painting', 'Saint Fulgentius of Ruspe', '17th century', [0.5, 0.2], 0.3) }),
	f('caesarius-of-arles', 'Caesarius of Arles', 'Caesarius von Arles', 542, ['Caesarius of Arles', 'Caesarius'], { saint: true, portrait: p('caesarius-of-arles.jpg', 'Woodcut', 'Saint Caesarius of Arles', '19th century', [0.4, 0.27], 0.35) }),
	f('olympiodorus-of-alexandria', 'Olympiodorus of Alexandria', 'Olympiodor von Alexandrien', 570, ['Olympiodorus of Alexandria', 'Olympiodorus the Deacon', 'Olympiodorus']),
	f('cassiodorus-senator', 'Cassiodorus', 'Cassiodor', 585, ['Cassiodorus Senator', 'Cassiodorus'], { portrait: p('cassiodorus-senator.jpg', 'Fulda workshop', 'Cassiodorus, from the Gesta Theodorici', '1177', [0.5, 0.18], 0.25) }),
	f('isodore-of-seville', 'Isidore of Seville', 'Isidor von Sevilla', 636, ['Isodore of Seville', 'Isidore of Seville', 'Isidore', 'Isidorus Hispalensis'], { saint: true, portrait: p('isodore-of-seville.jpg', 'Bartolomé Esteban Murillo', 'Saint Isidore of Seville', '1655', [0.4, 0.26], 0.22) }),
	f('isaac-of-syria', 'Isaac of Nineveh', 'Isaak von Ninive', 700, ['Isaac of Syria', 'Isaac the Syrian', 'Isaac of Nineveh'], { portrait: p('isaac-of-syria.jpg', 'Miniature', 'Saint Isaac the Syrian, Kirillo-Belozersky manuscript', '1518', [0.5, 0.15], 0.35) }),
	f('oecumenius', 'Oecumenius', 'Oecumenius', 990, ['Oecumenius', 'Pseudo-Oecumenius']),
	f('symeon-the-new-theologian', 'Symeon the New Theologian', 'Symeon der Neue Theologe', 1022, ['Symeon the New Theologian', 'Symeon'], { portrait: p('symeon-the-new-theologian.jpg', 'Icon', 'Saint Symeon the New Theologian', 'undated', [0.5, 0.2], 0.4) }),
	f('nicholas-of-lyra', 'Nicholas of Lyra', 'Nikolaus von Lyra', 1349, ['Nicholas of Lyra', 'Lyra', 'Lyranus'], { portrait: p('nicholas-of-lyra.jpg', 'Woodcut', 'Nicholas of Lyra', 'c. 1500', [0.5, 0.2], 0.4) }),
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
	return { id, name: { en: name, de: name }, died, group: groupFor(died), aliases: [name], major: false };
}

/** Whether a commentator, known or derived, is one of the renowned ones. */
export const isMajor = (id: string) => MAJOR.has(id);

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

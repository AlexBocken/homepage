/**
 * Lives of the commentators for the pages under /bibel/patres: four short
 * sections per person (life, teaching, the Church's view today, what is
 * peculiar to him), in English and German, with the sources they were
 * written from. Latin readers get the English. Labels that are not persons
 * (the Glossa, the pseudo-authors) carry a single explanatory paragraph.
 */
import { BIO_EN } from './fathersBio.en';
import { BIO_DE } from './fathersBio.de';

export type BioSections = {
	/** "354–430 · Tagaste, Milan, Hippo" */
	dates: string;
	life: string;
	teaching?: string;
	church?: string;
	particular?: string;
	feast?: string;
	titles?: string;
};

export type BioSource = { label: string; url: string };

const VATICAN = (d: string, year = d.slice(0, 4)) => `https://www.vatican.va/content/benedict-xvi/en/audiences/${year}/documents/hf_ben-xvi_aud_${d}.html`;
const CE = (n: string) => `https://www.newadvent.org/cathen/${n}.htm`;
const WIKI = (t: string) => `https://en.wikipedia.org/wiki/${t}`;
const audience = (d: string, n = 1): BioSource => ({ label: `Benedict XVI, General Audience ${d.slice(6, 8)}.${d.slice(4, 6)}.${d.slice(0, 4)}${n > 1 ? ` (${n})` : ''}`, url: VATICAN(d) });
const ce = (n: string, title: string): BioSource => ({ label: `Catholic Encyclopedia: ${title}`, url: CE(n) });
const wiki = (t: string, title = t.replace(/_/g, ' ')): BioSource => ({ label: `Wikipedia: ${title}`, url: WIKI(t) });

export const BIO_SOURCES: Record<string, BioSource[]> = {
	augustine: [audience('20080109'), audience('20080116'), audience('20080130'), audience('20080220'), audience('20080227'), ce('02084a', 'St. Augustine of Hippo'), { label: 'Augustine, De Trinitate II–III (New Advent)', url: 'https://www.newadvent.org/fathers/130102.htm' }],
	chrysostom: [audience('20070919'), audience('20070926'), ce('08452b', 'St. John Chrysostom')],
	jerome: [audience('20071107'), audience('20071114'), ce('08341a', 'St. Jerome'), { label: 'Francis, Scripturae Sacrae affectus (2020)', url: 'https://www.vatican.va/content/francesco/en/apost_letters/documents/papa-francesco-lettera-ap_20200930_scripturae-sacrae-affectus.html' }],
	ambrose: [audience('20071024'), ce('01383c', 'St. Ambrose')],
	'gregory-great': [audience('20080528'), audience('20080604'), ce('06780a', 'Pope St. Gregory I')],
	bede: [audience('20090218'), ce('02384a', 'The Venerable Bede')],
	origen: [audience('20070425'), audience('20070502'), ce('11306b', 'Origen and Origenism')],
	'cyril-alexandria': [audience('20071003'), ce('04592b', 'St. Cyril of Alexandria')],
	basil: [audience('20070704'), audience('20070801'), ce('02330b', 'St. Basil the Great')],
	'gregory-nazianzen': [audience('20070808'), audience('20070822'), ce('07010b', 'St. Gregory of Nazianzus')],
	'gregory-nyssa': [audience('20070829'), audience('20070905'), ce('07016a', 'St. Gregory of Nyssa')],
	athanasius: [audience('20070620'), ce('02035a', 'St. Athanasius')],
	'cyril-jerusalem': [audience('20070627'), ce('04595b', 'St. Cyril of Jerusalem')],
	ephrem: [audience('20071128'), ce('05498a', 'St. Ephraem')],
	hilary: [audience('20071010'), ce('07349b', 'St. Hilary of Poitiers')],
	tertullian: [audience('20070530'), ce('14520c', 'Tertullian')],
	cyprian: [audience('20070606'), ce('04583b', 'St. Cyprian of Carthage')],
	irenaeus: [audience('20070328'), ce('08130b', 'St. Irenaeus'), { label: 'Holy See Press Office, 21.01.2022: Irenaeus Doctor of the Church', url: 'https://press.vatican.va/content/salastampa/en/bollettino/pubblico/2022/01/21/220121a.html' }],
	'clement-alexandria': [audience('20070418'), ce('04045a', 'Clement of Alexandria')],
	'clement-rome': [audience('20070307'), ce('04012c', 'Pope St. Clement I')],
	ignatius: [audience('20070314'), ce('07644a', 'St. Ignatius of Antioch')],
	hippolytus: [ce('07360c', 'St. Hippolytus of Rome'), wiki('Hippolytus_of_Rome')],
	justin: [audience('20070321'), ce('08580c', 'St. Justin Martyr')],
	'leo-great': [audience('20080305'), ce('09154b', 'Pope St. Leo I')],
	'john-damascene': [audience('20090506'), ce('08459b', 'St. John Damascene')],
	cassian: [wiki('John_Cassian')],
	eusebius: [audience('20070613'), ce('05617b', 'Eusebius of Caesarea')],
	chrysologus: [wiki('Peter_Chrysologus')],
	theophylact: [wiki('Theophylact_of_Ohrid')],
	rabanus: [audience('20090603'), ce('12617a', 'Blessed Maurus Magnentius Rabanus')],
	alcuin: [ce('01276a', 'Alcuin')],
	remigius: [wiki('Remigius_of_Auxerre')],
	haimo: [wiki('Haimo_of_Auxerre')],
	lactantius: [ce('08736a', 'Lactantius'), wiki('Lactantius')],
	anselm: [audience('20090923'), ce('01546a', 'St. Anselm')],
	bernard: [audience('20091021'), ce('02498d', 'St. Bernard of Clairvaux')],
	aquinas: [audience('20100602'), audience('20100616'), audience('20100623'), ce('14663b', 'St. Thomas Aquinas')],
	glossa: [wiki('Glossa_Ordinaria')],
	lapide: [wiki('Cornelius_a_Lapide')],
	haydock: [wiki('George_Leo_Haydock')],
	challoner: [wiki('Richard_Challoner')],
	erasmus: [ce('05510b', 'Desiderius Erasmus'), wiki('Erasmus')],
	ambrosiaster: [wiki('Ambrosiaster')],
	'theophilus-of-antioch': [wiki('Theophilus_of_Antioch')],
	'polycarp-of-smyrna': [wiki('Polycarp')],
	'the-didache': [wiki('Didache')],
	'shepherd-of-hermas': [wiki('The_Shepherd_of_Hermas')],
	'victorinus-of-pettau': [wiki('Victorinus_of_Pettau')],
	'methodius-of-olympus': [wiki('Methodius_of_Olympus')],
	'aphrahat-the-persian-sage': [audience('20071121'), wiki('Aphrahat')],
	'gaius-marius-victorinus': [wiki('Gaius_Marius_Victorinus')],
	'titus-of-bostra': [wiki('Titus_of_Bostra')],
	'the-apostolic-constitutions': [wiki('Apostolic_Constitutions')],
	'diodorus-of-tarsus': [wiki('Diodorus_of_Tarsus')],
	'pacian-of-barcelona': [wiki('Pacian')],
	'didymus-the-blind': [wiki('Didymus_the_Blind')],
	'evagrius-ponticus': [wiki('Evagrius_Ponticus')],
	'chromatius-of-aquileia': [audience('20071205'), wiki('Chromatius')],
	'rufinus-of-aquileia': [wiki('Tyrannius_Rufinus')],
	'severian-of-gabala': [wiki('Severian_of_Gabala')],
	'hesychius-of-jerusalem': [wiki('Hesychius_of_Jerusalem')],
	'julian-of-eclanum': [wiki('Julian_of_Eclanum')],
	'maximus-of-turin': [audience('20071031'), wiki('Maximus_of_Turin')],
	'gennadius-of-constantinople': [wiki('Gennadius_of_Constantinople')],
	'salvian-the-presbyter': [wiki('Salvian')],
	'pseudo-dionysius-the-areopagite': [audience('20080514'), wiki('Pseudo-Dionysius_the_Areopagite')],
	'fulgentius-of-ruspe': [wiki('Fulgentius_of_Ruspe')],
	'caesarius-of-arles': [wiki('Caesarius_of_Arles')],
	'olympiodorus-of-alexandria': [wiki('Olympiodorus_the_Deacon')],
	'cassiodorus-senator': [audience('20080312'), wiki('Cassiodorus')],
	'isodore-of-seville': [audience('20080618'), wiki('Isidore_of_Seville')],
	'isaac-of-syria': [wiki('Isaac_of_Nineveh', 'Isaac the Syrian')],
	oecumenius: [wiki('Oecumenius')],
	'symeon-the-new-theologian': [audience('20090916'), wiki('Symeon_the_New_Theologian')],
	'hugh-of-saint-cher': [wiki('Hugh_of_Saint-Cher')],
	'nicholas-of-lyra': [wiki('Nicholas_of_Lyra')]
};

export type FatherBio = BioSections & { sources: BioSource[]; lang: 'en' | 'de' };

/** The bio in the reader's language, English for Latin and where no German exists. */
export function bioFor(id: string, lang: 'de' | 'en' | 'la'): FatherBio | null {
	const de = lang === 'de' ? BIO_DE[id] : undefined;
	const en = BIO_EN[id];
	const sections = de ?? en;
	if (!sections) return null;
	return { ...sections, sources: BIO_SOURCES[id] ?? [], lang: de ? 'de' : 'en' };
}

export const hasBio = (id: string) => id in BIO_EN;
/** A person with the four sections, as against a label like the Glossa or a pseudo-author. */
export const isPerson = (id: string) => !!BIO_EN[id]?.teaching;

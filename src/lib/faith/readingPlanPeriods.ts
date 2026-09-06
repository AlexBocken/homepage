/**
 * The salvation-history plan's spine: the twelve periods of the Great
 * Adventure Bible Timeline (Jeff Cavins), as the Bible in a Year reads them.
 * Fourteen narrative books tell the story from Creation to the Church; the
 * other books are read alongside the period they belong to. Psalms and
 * Proverbs are not here: they form the wisdom lane spread over the whole plan.
 *
 * A book entry is a slug, or a slug with a chapter range where a book
 * straddles two periods (Genesis 1–11 is the Early World, 12–50 the
 * Patriarchs).
 */
export type BookRange = string | { slug: string; from: number; to: number };

export type Period = {
	id: string;
	name: { de: string; en: string; la: string };
	narrative: BookRange[];
	supplemental: BookRange[];
};

export const HISTORIA_PERIODS: Period[] = [
	{
		id: 'early-world',
		name: { de: 'Frühe Welt', en: 'Early World', la: 'Mundus primaevus' },
		narrative: [{ slug: 'gen', from: 1, to: 11 }],
		supplemental: []
	},
	{
		id: 'patriarchs',
		name: { de: 'Patriarchen', en: 'Patriarchs', la: 'Patriarchae' },
		narrative: [{ slug: 'gen', from: 12, to: 50 }],
		supplemental: ['ijob']
	},
	{
		id: 'exodus',
		name: { de: 'Ägypten und Auszug', en: 'Egypt and Exodus', la: 'Aegyptus et Exodus' },
		narrative: ['ex'],
		supplemental: ['lev']
	},
	{
		id: 'desert',
		name: { de: 'Wüstenwanderung', en: 'Desert Wanderings', la: 'Peregrinatio in deserto' },
		narrative: ['num'],
		supplemental: ['dtn']
	},
	{
		id: 'conquest',
		name: { de: 'Landnahme und Richter', en: 'Conquest and Judges', la: 'Occupatio terrae et Iudices' },
		narrative: ['jos', 'ri'],
		supplemental: ['rut']
	},
	{
		id: 'kingdom',
		name: { de: 'Königreich', en: 'Royal Kingdom', la: 'Regnum' },
		narrative: ['1sam', '2sam', { slug: '1kön', from: 1, to: 11 }],
		supplemental: ['1chr', { slug: '2chr', from: 1, to: 9 }, 'koh', 'hld', 'weish', 'sir']
	},
	{
		id: 'divided',
		name: { de: 'Geteiltes Reich', en: 'Divided Kingdom', la: 'Regnum divisum' },
		narrative: [{ slug: '1kön', from: 12, to: 22 }, { slug: '2kön', from: 1, to: 17 }],
		supplemental: [{ slug: '2chr', from: 10, to: 36 }, 'hos', 'am', 'jona', 'mi', 'jes', 'nah', 'zef', 'hab']
	},
	{
		id: 'exile',
		name: { de: 'Exil', en: 'Exile', la: 'Exsilium' },
		narrative: [{ slug: '2kön', from: 18, to: 25 }],
		supplemental: ['jer', 'klgl', 'bar', 'ez', 'dan', 'obd', 'tob', 'jdt']
	},
	{
		id: 'return',
		name: { de: 'Rückkehr', en: 'Return', la: 'Reditus' },
		narrative: ['esra', 'neh'],
		supplemental: ['hag', 'sach', 'mal', 'joel', 'est']
	},
	{
		id: 'maccabees',
		name: { de: 'Makkabäer', en: 'Maccabean Revolt', la: 'Machabaei' },
		narrative: ['1makk'],
		supplemental: ['2makk']
	},
	{
		id: 'messiah',
		name: { de: 'Messianische Erfüllung', en: 'Messianic Fulfillment', la: 'Adimpletio messianica' },
		narrative: ['lk'],
		supplemental: ['mt', 'mk', 'joh']
	},
	{
		id: 'church',
		name: { de: 'Die Kirche', en: 'The Church', la: 'Ecclesia' },
		narrative: ['apg'],
		supplemental: ['röm', '1kor', '2kor', 'gal', 'eph', 'phil', 'kol', '1thess', '2thess', '1tim', '2tim', 'tit', 'phlm', 'hebr', 'jak', '1petr', '2petr', '1joh', '2joh', '3joh', 'jud', 'offb']
	}
];

/** The lane read a little of every day, across all periods. */
export const HISTORIA_WISDOM: BookRange[] = ['ps', 'spr'];

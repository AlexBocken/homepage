import { lookupReference } from './bible';
import { resolveStaticAsset } from './staticAsset';

// English-bookname → German citation parts.
//   tsv:   abbreviation that allioli.tsv understands (used to look up verse)
//   full:  the full German book name as written in Allioli (used for display)
const EN_TO_DE_BOOK: Record<string, { tsv: string; full: string }> = {
	Genesis: { tsv: '1Mo', full: '1 Mose' },
	Exodus: { tsv: '2Mo', full: '2 Mose' },
	Leviticus: { tsv: '3Mo', full: '3 Mose' },
	Numbers: { tsv: '4Mo', full: '4 Mose' },
	Deuteronomy: { tsv: '5Mo', full: '5 Mose' },
	Joshua: { tsv: 'Jos', full: 'Josua' },
	Judges: { tsv: 'Ri', full: 'Richter' },
	Ruth: { tsv: 'Rt', full: 'Rut' },
	'1 Samuel': { tsv: '1Sam', full: '1 Samuel' },
	'2 Samuel': { tsv: '2Sam', full: '2 Samuel' },
	'1 Kings': { tsv: '1Kö', full: '1 Könige' },
	'2 Kings': { tsv: '2Kö', full: '2 Könige' },
	'1 Chronicles': { tsv: '1Chr', full: '1 Chronik' },
	'2 Chronicles': { tsv: '2Chr', full: '2 Chronik' },
	Ezra: { tsv: 'Esr', full: 'Esra' },
	Nehemiah: { tsv: 'Neh', full: 'Nehemia' },
	Esther: { tsv: 'Est', full: 'Ester' },
	Job: { tsv: 'Hi', full: 'Hiob' },
	Psalm: { tsv: 'Ps', full: 'Psalm' },
	Psalms: { tsv: 'Ps', full: 'Psalm' },
	Proverbs: { tsv: 'Spr', full: 'Sprüche' },
	Ecclesiastes: { tsv: 'Pred', full: 'Prediger' },
	'Song of Solomon': { tsv: 'Hl', full: 'Hohelied' },
	Isaiah: { tsv: 'Jes', full: 'Jesaja' },
	Jeremiah: { tsv: 'Jer', full: 'Jeremia' },
	Lamentations: { tsv: 'Kla', full: 'Klagelieder' },
	Ezekiel: { tsv: 'Hes', full: 'Hesekiel' },
	Daniel: { tsv: 'Dan', full: 'Daniel' },
	Hosea: { tsv: 'Hos', full: 'Hosea' },
	Joel: { tsv: 'Joe', full: 'Joel' },
	Amos: { tsv: 'Am', full: 'Amos' },
	Obadiah: { tsv: 'Ob', full: 'Obadja' },
	Jonah: { tsv: 'Jon', full: 'Jona' },
	Micah: { tsv: 'Mi', full: 'Micha' },
	Nahum: { tsv: 'Nah', full: 'Nahum' },
	Habakkuk: { tsv: 'Hab', full: 'Habakuk' },
	Zephaniah: { tsv: 'Zeph', full: 'Zephanja' },
	Haggai: { tsv: 'Hagg', full: 'Haggai' },
	Zechariah: { tsv: 'Sach', full: 'Sacharja' },
	Malachi: { tsv: 'Mal', full: 'Maleachi' },
	Matthew: { tsv: 'Mt', full: 'Matthäus' },
	Mark: { tsv: 'Mk', full: 'Markus' },
	Luke: { tsv: 'Lk', full: 'Lukas' },
	John: { tsv: 'Joh', full: 'Johannes' },
	Acts: { tsv: 'Apg', full: 'Apostelgeschichte' },
	Romans: { tsv: 'Röm', full: 'Römer' },
	'1 Corinthians': { tsv: '1Kor', full: '1 Korinther' },
	'2 Corinthians': { tsv: '2Kor', full: '2 Korinther' },
	Galatians: { tsv: 'Gal', full: 'Galater' },
	Ephesians: { tsv: 'Eph', full: 'Epheser' },
	Philippians: { tsv: 'Phil', full: 'Philipper' },
	Colossians: { tsv: 'Kol', full: 'Kolosser' },
	'1 Thessalonians': { tsv: '1Thes', full: '1 Thessalonicher' },
	'2 Thessalonians': { tsv: '2Thes', full: '2 Thessalonicher' },
	'1 Timothy': { tsv: '1Tim', full: '1 Timotheus' },
	'2 Timothy': { tsv: '2Tim', full: '2 Timotheus' },
	Titus: { tsv: 'Tit', full: 'Titus' },
	Philemon: { tsv: 'Phim', full: 'Philemon' },
	Hebrews: { tsv: 'Heb', full: 'Hebräer' },
	James: { tsv: 'Jak', full: 'Jakobus' },
	'1 Peter': { tsv: '1Petr', full: '1 Petrus' },
	'2 Peter': { tsv: '2Petr', full: '2 Petrus' },
	'1 John': { tsv: '1Jo', full: '1 Johannes' },
	'2 John': { tsv: '2Jo', full: '2 Johannes' },
	'3 John': { tsv: '3Jo', full: '3 Johannes' },
	Jude: { tsv: 'Jud', full: 'Judas' },
	Revelation: { tsv: 'Offb', full: 'Offenbarung' }
};

// Splits "1 Corinthians 15:17" into ["1 Corinthians", "15:17"].
function splitRef(ref: string): { book: string; chapVerse: string } | null {
	const m = ref.match(/^(.+?)\s+(\d+\s*[:,]\s*\d+(?:\s*-\s*\d+)?)$/);
	if (!m) return null;
	return { book: m[1].trim(), chapVerse: m[2].replace(/\s+/g, '') };
}

export type ResolvedScripture = { text: string; ref: string };

export function resolveScriptureForLang(
	enRef: string,
	lang: 'en' | 'de' | 'la'
): ResolvedScripture {
	const split = splitRef(enRef);
	if (lang === 'de') {
		const map = split ? EN_TO_DE_BOOK[split.book] : null;
		if (split && map) {
			const lookupRef = `${map.tsv} ${split.chapVerse}`;
			const tsvPath = resolveStaticAsset('allioli.tsv');
			const result = lookupReference(lookupRef, tsvPath);
			if (result && result.verses.length) {
				const text = result.verses.map((v) => v.text).join(' ');
				const display = `${map.full} ${split.chapVerse.replace(':', ',')}`;
				return { text, ref: display };
			}
		}
		// Fallback: return original English ref unchanged
		return { text: '', ref: enRef };
	}

	// Default: English (faith / fides — drb.tsv)
	const tsvPath = resolveStaticAsset('drb.tsv');
	const result = lookupReference(enRef, tsvPath);
	if (result && result.verses.length) {
		const text = result.verses.map((v) => v.text).join(' ');
		return { text, ref: enRef };
	}
	return { text: '', ref: enRef };
}

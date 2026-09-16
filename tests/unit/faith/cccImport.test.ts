import { describe, it, expect } from 'vitest';
import { repair, type RawItem, type RawNote } from '../../../scripts/ccc/stream';
import { extractRefs } from '../../../scripts/ccc/refs';
import { linkifyBible, newTally } from '../../../scripts/ccc/linkify';
import { linkifyDocs, newDocTally } from '../../../scripts/ccc/docs';
import { parseCanons, withoutEditorial } from '../../../scripts/council/cic';
import type { Canon } from '$lib/faith/councilTypes';
import { vulgatePsalm } from '../../../scripts/ccc/psalms';
import { parseIndented, parseRefs } from '../../../scripts/ccc/register';
import { cccAncestors, cccLabel, parseCccRange } from '$lib/faith/cccTypes';

const p = (n: number, html: string, notes: RawNote[] = []): RawItem => ({ k: 'p', n, prefix: `${n} `, html, notes });
const q = (html: string): RawItem => ({ k: 'q', html, notes: [] });

describe('repair', () => {
	it('splits a paragraph that swallowed the next number', () => {
		const out = repair([p(2435, 'Recourse to a strike is morally legitimate when it cannot be avoided. 2436 Unemployment almost always wounds its victim.')]);
		expect(out.map((i) => (i.k === 'p' ? i.n : i.k))).toEqual([2435, 2436]);
		expect(out[1]).toMatchObject({ html: 'Unemployment almost always wounds its victim.' });
	});

	it('re-joins a paragraph broken across blocks mid-sentence', () => {
		const out = repair([p(2077, 'The'), q('gift of the Decalogue is bestowed from within the covenant.')]);
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ n: 2077, html: 'The gift of the Decalogue is bestowed from within the covenant.' });
	});

	it('leaves a real quotation where it is', () => {
		const out = repair([p(102, 'Through all the words of Sacred Scripture, God speaks only one Word.'), q('"You recall that one and the same Word of God extends throughout Scripture."')]);
		expect(out.map((i) => i.k)).toEqual(['p', 'q']);
	});

	it('shifts a re-joined tail’s footnote markers onto the paragraph’s list', () => {
		const out = repair([
			{ k: 'p', n: 500, prefix: '500 ', html: 'Opening<sup data-note="0"></sup> and', notes: [{ marker: '11', text: 'Cf. Jn 1:1.' }] },
			{ k: 'q', html: 'continued<sup data-note="0"></sup> here.', notes: [{ marker: '12', text: 'Cf. Jn 1:14.' }] }
		]);
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ html: 'Opening<sup data-note="0"></sup> and continued<sup data-note="1"></sup> here.' });
	});

	it('demotes a numbered list item that does not continue the sequence', () => {
		const demoted: number[] = [];
		const out = repair([p(116, 'The literal sense.'), p(1, 'Der allegorische Sinn.')], (n) => demoted.push(n));
		expect(demoted).toEqual([1]);
		expect(out[1]).toMatchObject({ k: 'q', html: '1 Der allegorische Sinn.' });
	});
});

describe('extractRefs', () => {
	/** Everything is in this Bible unless a test says otherwise. */
	const all = () => true;

	it('resolves the German edition’s bracketed references', () => {
		const refs = extractRefs('Vgl. Lk 4,16-22; Jes 61,1', 'de', all);
		expect(refs).toEqual([
			{ kind: 'bible', text: 'Lk 4,16-22', slug: 'lk', chapter: 4, verse: 16, to: 22 },
			{ kind: 'bible', text: 'Jes 61,1', slug: 'jes', chapter: 61, verse: 1, to: null }
		]);
	});

	it('reads the English edition’s Roman ordinals, and the scan’s l-for-1', () => {
		expect(extractRefs('Cf. I Cor 10:6, 11; l Pt 3:21.', 'en', all).map((r) => r.kind === 'bible' && r.slug)).toEqual(['1kor', '1petr']);
	});

	it('resolves Latin abbreviations', () => {
		expect(extractRefs('Cf Io 6,27; Apc 7,2-3.', 'la', all).map((r) => r.kind === 'bible' && r.slug)).toEqual(['joh', 'offb']);
	});

	it('keeps a non-Scripture citation as text rather than inventing a book', () => {
		expect(extractRefs('Sanctus Thomas Aquinas, Summa theologiae, III, q. 72, a. 5: Ed. Leon. 12, 130.', 'la', all)).toEqual([
			{ kind: 'doc', text: 'Sanctus Thomas Aquinas, Summa theologiae, III, q. 72, a. 5: Ed. Leon. 12, 130.' }
		]);
	});
});

describe('linkifyBible', () => {
	/** Everything is in this Bible unless a test says otherwise. */
	const all = () => true;

	it('wraps a citation the markup breaks in two without crossing the tag', () => {
		const out = linkifyBible('erit « Deus omnia » (<em>1 Cor </em>15,28).', 'la', all, newTally());
		expect(out).toBe('erit « Deus omnia » (<em><a class="ref" data-ref="1Kor 15,28" data-b="1kor/15/28">1 Cor </a></em><a class="ref" data-ref="1Kor 15,28" data-b="1kor/15/28">15,28</a>).');
	});

	it('leaves a citation the reader has no verse for unlinked', () => {
		const out = linkifyBible('Vgl. Hebr 99,1.', 'de', () => false, newTally());
		expect(out).toBe('Vgl. Hebr 99,1.');
	});

	it('corrects the German scan’s "Job" for "Joh", in the link and on the page', () => {
		const out = linkifyBible('Vgl. Job 12,27.', 'de', all, newTally());
		expect(out).toContain('data-b="joh/12/27"');
		expect(out).toContain('>Joh 12,27</a>');
	});

	it('links a psalm to the psalm, in the numbering the site’s Bible uses', () => {
		const out = linkifyBible('Vgl. Ps 51,12.', 'de', all, newTally());
		// Hebrew 51 is Vulgate 50, and no verse is claimed.
		expect(out).toContain('<a class="ref" data-b="ps/50">Ps 51,12</a>');
		expect(out).not.toContain('data-ref');
	});

	it('counts what it linked', () => {
		const tally = newTally();
		linkifyBible('Vgl. Joh 3,16; Hebr 99,1; Ps 23,1; Vgl. Ez 36.', 'de', (slug) => slug !== 'hebr', tally);
		// Hebrews is in no Bible here, so nothing of it is linked at all.
		expect(tally).toMatchObject({ linked: 1, psalms: 1, chapters: 1 });
	});

	/* ---------- what the scans did to the citations ---------- */

	it('reads a further verse of the same chapter, and the run that follows it', () => {
		// "Apg 14,15.17; 17,27-28" — the ".17" used to be dropped, and with it
		// everything standing behind it.
		const out = linkifyBible('Vgl. Apg 14,15.17; 17,27-28.', 'de', all, newTally());
		expect(out).toContain('data-b="apg/14/15"');
		expect(out).toContain('data-b="apg/14/17"');
		expect(out).toContain('data-b="apg/17/27-28"');
	});

	it('goes on with a list whose first citation cannot be resolved', () => {
		const out = linkifyBible('Vgl. Ex 20,39; 36,20-21.', 'de', (_s, c) => c !== 20, newTally());
		expect(out).toContain('data-b="ex/36/20-21"');
	});

	it('reads a book the edition set in lower case', () => {
		expect(linkifyBible('Vgl. weish 2,24.', 'de', all, newTally())).toContain('data-b="weish/2/24"');
	});

	it('does not read a short lower-case word as the book it abbreviates', () => {
		// "am" is Amos in the table, and German for "on the".
		expect(linkifyBible('am 3,4 Prozent', 'de', all, newTally())).not.toContain('data-b');
	});

	it('reads the l a scan left where a 1 belongs, and re-sets the citation', () => {
		const out = linkifyBible('Vgl. Lk 2l,24.', 'de', all, newTally());
		expect(out).toContain('data-b="lk/21/24"');
		expect(out).toContain('>Lk 21,24</a>');
	});

	it('reads a capital I a scan left in the book’s own name', () => {
		expect(linkifyBible('Vgl. KoI 1,27.', 'de', all, newTally())).toContain('data-b="kol/1/27"');
	});

	it('puts back a hyphen the scan ate out of a range', () => {
		const out = linkifyBible('Vgl. Ijob 10,812.', 'de', (_s, _c, v) => v <= 22, newTally());
		expect(out).toContain('data-b="ijob/10/8-12"');
	});

	it('leaves a citation two repairs would mend differently', () => {
		// "6,45" is either the range 4-5 with its hyphen gone or verse 4 with a
		// footnote's 5 stuck to it, and Deuteronomy 6 has both verses.
		expect(linkifyBible('Cf. Dt 6:45.', 'en', (_s, _c, v) => v <= 25, newTally())).not.toContain('data-b');
	});

	it('leaves a verse alone where our Bible simply stops sooner', () => {
		// The Vulgate ends Malachi 3 at 18 and the Catechism cites 19.
		expect(linkifyBible('Vgl. Mal 3,19.', 'de', (_s, _c, v) => v <= 18, newTally())).not.toContain('data-b');
	});

	it('reads a lone number after a one-chapter book as its verse', () => {
		// "3 Joh 7" is the third letter of John, not the seventh chapter of a
		// gospel — and the German scan writes it "3 Job 7".
		const out = linkifyBible('Vgl. 3 Job 7.', 'de', (slug, c) => slug === '3joh' && c === 1, newTally());
		expect(out).toContain('data-b="3joh/1/7"');
	});

	it('drops a stray digit read as the book’s ordinal', () => {
		const out = linkifyBible('Vgl. 1 Joh 6,16-17.', 'de', (slug) => slug === 'joh', newTally());
		expect(out).toContain('data-b="joh/6/16-17"');
	});

	it('links a whole chapter where the edition cites one, and opens no peek on it', () => {
		const out = linkifyBible('Vgl. Ez 36.', 'de', all, newTally());
		expect(out).toContain('<a class="ref" data-b="ez/36">Ez 36</a>');
		expect(out).not.toContain('data-ref');
	});

	it('does not read a number standing after a word as a chapter', () => {
		expect(linkifyBible('so 3 Tage lang', 'de', all, newTally())).not.toContain('data-b');
	});

	it('sends the English edition’s Kings to Kings, not to Samuel', () => {
		// The Douay names Samuel "Kings"; this edition writes both, so they are
		// two books, and 1 Kings 8 runs to verse 61 where 1 Samuel 8 stops at 22.
		expect(linkifyBible('Cf. 1 Kings 8:10-61.', 'en', all, newTally())).toContain('data-b="1kön/8/10-61"');
	});
});

describe('vulgatePsalm', () => {
	it('translates the numbering the Catechism cites into the Vulgate’s', () => {
		expect([1, 9, 10, 51, 114, 116, 147, 150].map(vulgatePsalm)).toEqual([1, 9, 9, 50, 113, 114, 146, 150]);
	});
});

describe('the register', () => {
	it('expands the abbreviated end of a printed range', () => {
		expect(parseRefs('2270-75, 144-46, 2322-23, 1080').map((r) => `${r.from}-${r.to}`)).toEqual(['2270-2275', '144-146', '2322-2323', '1080-1080']);
	});

	it('reads a headword and the lines indented under it', () => {
		const [entry] = parseIndented(['Abtreibung: 2270-2275', '\tVerurteilung in der frühen Kirche: 2271', '\tExkommunikation als Strafe: 2272'].join('\n'));
		expect(entry.label).toBe('Abtreibung');
		expect(entry.refs).toEqual([{ from: 2270, to: 2275 }]);
		expect(entry.lines.map((l) => l.label)).toEqual(['Verurteilung in der frühen Kirche', 'Exkommunikation als Strafe']);
	});

	it('keeps a colon that belongs to the label', () => {
		const [entry] = parseIndented('Kirche und Staat: Grundsätze des Verhältnisses: 2244-2246');
		expect(entry).toMatchObject({ label: 'Kirche und Staat: Grundsätze des Verhältnisses', refs: [{ from: 2244, to: 2246 }] });
	});

	it('reads a cross-reference, path and all', () => {
		const [a, b] = parseIndented(['Abneigung: siehe Leidenschaften: Vielfalt', 'Advent: 524, 1095', '\tsiehe auch: Liturgie: Zeiten des Kirchenjahres'].join('\n'));
		expect(a).toMatchObject({ label: 'Abneigung', see: ['Leidenschaften: Vielfalt'] });
		expect(b.lines[0]).toMatchObject({ label: '', see: ['Liturgie: Zeiten des Kirchenjahres'] });
	});

	it('does not swallow a sub-entry that happens to start lower-case', () => {
		const [entry] = parseIndented(['Jesus Christus', '\tund die Kirche', '\tNachfolge Jesu: 520'].join('\n'));
		expect(entry.label).toBe('Jesus Christus');
		expect(entry.lines.map((l) => l.label)).toEqual(['und die Kirche', 'Nachfolge Jesu']);
	});
});

describe('citation helpers', () => {
	it('reads a paragraph or a range', () => {
		expect(parseCccRange('1322')).toEqual({ from: 1322, to: 1322 });
		expect(parseCccRange('1322-1327')).toEqual({ from: 1322, to: 1327 });
		expect(parseCccRange('2866')).toBeNull();
		expect(parseCccRange('1327-1322')).toBeNull();
	});

	it('spells a section id out into its ancestors', () => {
		expect(cccAncestors('p2s2c1a3')).toEqual(['p2', 'p2s2', 'p2s2c1', 'p2s2c1a3']);
		expect(cccAncestors('p1s2c1a1p2')).toEqual(['p1', 'p1s2', 'p1s2c1', 'p1s2c1a1', 'p1s2c1a1p2']);
		expect(cccAncestors('prologus')).toEqual(['prologus']);
	});

	it('labels a citation the way each language writes it', () => {
		expect(cccLabel('de', 2095)).toBe('KKK 2095');
		expect(cccLabel('en', 2095)).toBe('CCC 2095');
		expect(cccLabel('la', 1322, 1327)).toBe('CEC 1322–1327');
	});
});

describe('linkifyDocs', () => {
	it('links a council citation by its abbreviation, where the edition uses one', () => {
		const out = linkifyDocs('Vgl. LG 11.', 'de', newDocTally());
		expect(out).toContain('data-council="lg/11"');
		expect(out).toContain('>LG 11</a>');
	});

	it('links the Latin’s spelled-out form', () => {
		const out = linkifyDocs('Cf Concilium Vaticanum II, Const. dogm. Lumen gentium, 11: AAS 57 (1965) 15.', 'la', newDocTally());
		expect(out).toContain('data-council="lg/11"');
	});

	it('leaves Sources Chrétiennes alone in the Latin apparatus', () => {
		// "SC 296" there is a volume of the series, not the liturgy constitution.
		expect(linkifyDocs('Cf Egeria, Itinerarium 46, 2: SC 296, 308.', 'la', newDocTally())).not.toContain('data-council');
	});

	it('refuses an article past the end of the document it names', () => {
		const tally = newDocTally();
		expect(linkifyDocs('Vgl. DV 96.', 'de', tally)).not.toContain('data-council');
		expect(tally.dropped.get('DV')).toBe(1);
	});

	it('links a canon and a run of canons', () => {
		expect(linkifyDocs('CIC, can. 1055 § 1.', 'de', newDocTally())).toContain('data-canon="1055"');
		expect(linkifyDocs('CIC canones 916-917.', 'la', newDocTally())).toContain('data-canon="916-917"');
	});

	it('leaves the eastern Code alone, which is not here', () => {
		expect(linkifyDocs('CCEO, can. 675.', 'de', newDocTally())).not.toContain('data-canon');
	});
});

describe('the Code of Canon Law', () => {
	it('reads a canon whose number the page dashes on the wrong side', () => {
		const canons = new Map<number, Canon>();
		parseCanons('<html><body><p>Can. &#x2014; 193 &sect; 1. Eines Amtes …</p></body></html>', canons, [], 193);
		expect(canons.get(193)?.html).toMatch(/^§ 1\./);
	});

	it('does not begin a canon where the prose merely cites one', () => {
		const canons = new Map<number, Canon>();
		parseCanons('<html><body><p>Can. 1438 &#x2014; Unter Wahrung der Vorschrift gilt, falls nicht Can. 1439 Platz greift; 2° in Verfahren …</p></body></html>', canons, [], 1438);
		expect([...canons.keys()]).toEqual([1438]);
		expect(canons.get(1438)?.html).toContain('Can. 1439 Platz greift');
	});

	it('reads a canon that stands outside any paragraph, as Book VI does', () => {
		const canons = new Map<number, Canon>();
		parseCanons('<html><body><div><p>Can. 1329 — …</p><b>Can. 1330</b>&#8212;&nbsp;Eine Straftat …<p>&nbsp;</p></div></body></html>', canons, [], 1329);
		expect(canons.get(1330)?.html).toContain('Eine Straftat');
	});

	it('takes the editorial note about a later amendment off the end', () => {
		expect(withoutEditorial('Der Text des Canons. [Apostolisches Schreiben in Form eines Motu proprio …]')).toBe('Der Text des Canons.');
	});
});

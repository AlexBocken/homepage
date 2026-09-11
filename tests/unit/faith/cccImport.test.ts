import { describe, it, expect } from 'vitest';
import { repair, type RawItem, type RawNote } from '../../../scripts/ccc/stream';
import { extractRefs } from '../../../scripts/ccc/refs';
import { linkifyBible, newTally } from '../../../scripts/ccc/linkify';
import { vulgatePsalm } from '../../../scripts/ccc/psalms';
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
	it('resolves the German edition’s bracketed references', () => {
		const refs = extractRefs('Vgl. Lk 4,16-22; Jes 61,1', 'de');
		expect(refs).toEqual([
			{ kind: 'bible', text: 'Lk 4,16-22', slug: 'lk', chapter: 4, verse: 16, to: 22 },
			{ kind: 'bible', text: 'Jes 61,1', slug: 'jes', chapter: 61, verse: 1, to: null }
		]);
	});

	it('reads the English edition’s Roman ordinals, and the scan’s l-for-1', () => {
		expect(extractRefs('Cf. I Cor 10:6, 11; l Pt 3:21.', 'en').map((r) => r.kind === 'bible' && r.slug)).toEqual(['1kor', '1petr']);
	});

	it('resolves Latin abbreviations', () => {
		expect(extractRefs('Cf Io 6,27; Apc 7,2-3.', 'la').map((r) => r.kind === 'bible' && r.slug)).toEqual(['joh', 'offb']);
	});

	it('keeps a non-Scripture citation as text rather than inventing a book', () => {
		expect(extractRefs('Sanctus Thomas Aquinas, Summa theologiae, III, q. 72, a. 5: Ed. Leon. 12, 130.', 'la')).toEqual([
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

	it('counts what it linked and what it could not', () => {
		const tally = newTally();
		linkifyBible('Vgl. Joh 3,16; Hebr 99,1; Ps 23,1.', 'de', (slug) => slug !== 'hebr', tally);
		expect(tally).toMatchObject({ linked: 1, psalms: 1 });
		expect(tally.dropped.get('hebr')).toBe(1);
	});
});

describe('vulgatePsalm', () => {
	it('translates the numbering the Catechism cites into the Vulgate’s', () => {
		expect([1, 9, 10, 51, 114, 116, 147, 150].map(vulgatePsalm)).toEqual([1, 9, 9, 50, 113, 114, 146, 150]);
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

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { FATHERS, findFather, derivedFather, groupFor, fatherLabel, fatherInitials } from '../../../src/lib/faith/fathers';
import { CANON } from '../../../src/lib/faith/bibleCanon';

describe('the fathers registry', () => {
	it('has unique ids and resolves the spellings the sources use', () => {
		const ids = FATHERS.map((f) => f.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(findFather('Chrysostom')?.id).toBe('chrysostom');
		expect(findFather('John Chrysostom')?.id).toBe('chrysostom');
		expect(findFather('CHRSSTM')?.id).toBe('chrysostom');
		expect(findFather('Aug.')?.id).toBe('augustine');
		expect(findFather('Gregory The Dialogist')?.id).toBe('gregory-great');
		expect(findFather('Gloss')?.id).toBe('glossa');
		expect(findFather('Saint Basil')?.id).toBe('basil');
		expect(findFather('Nobody Known')).toBeNull();
	});

	it('groups by the year of death and derives unknown authors', () => {
		expect(groupFor(430)).toBe('father');
		expect(groupFor(735)).toBe('father');
		expect(groupFor(1107)).toBe('medieval');
		expect(groupFor(1849)).toBe('modern');
		expect(groupFor(null)).toBe('father');
		const d = derivedFather('Theophilus of Antioch', 184);
		expect(d.id).toBe('theophilus-of-antioch');
		expect(d.group).toBe('father');
		expect(FATHERS.find((f) => f.id === 'haydock')?.group).toBe('modern');
		expect(FATHERS.find((f) => f.id === 'aquinas')?.group).toBe('medieval');
	});

	it('labels saints and makes initials', () => {
		const aug = findFather('augustine')!;
		expect(fatherLabel(aug, 'de')).toBe('Hl. Augustinus von Hippo');
		expect(fatherLabel(aug, 'en')).toBe('St Augustine of Hippo');
		expect(fatherLabel(findFather('tertullian')!, 'en')).toBe('Tertullian');
		expect(fatherInitials('Augustine of Hippo')).toBe('AH');
		expect(fatherInitials('Pseudo-Chrysostom')).toBe('CH');
		expect(fatherInitials('Bede')).toBe('BE');
	});

	it('every portrait file in the registry exists with its crops', () => {
		for (const f of FATHERS) {
			if (!f.portrait) continue;
			const dir = path.resolve(__dirname, '../../../static/glaube/fathers');
			expect(existsSync(path.join(dir, f.portrait.file)), f.id).toBe(true);
			expect(existsSync(path.join(dir, `${f.id}-48.webp`)), f.id).toBe(true);
		}
	});
});

describe('the importer', () => {
	it('maps every OSIS abbreviation the corpora use onto the canon', async () => {
		const dir = process.env.COMMENTARIES_DIR ?? path.resolve(__dirname, '../../../../commentaries');
		const { OSIS } = await import('../../../scripts/import-commentary-osis');
		for (const slug of Object.values(OSIS)) expect(slug in CANON, slug).toBe(true);
		if (!existsSync(dir)) return;
		for (const file of ['catenabible.json', 'catena_aurea.json', 'haydock.json', 'chrysostom.json', 'augustine.json']) {
			const p = path.join(dir, file);
			if (!existsSync(p)) continue;
			const abbrs = new Set([...readFileSync(p, 'utf-8').matchAll(/"abbreviation":\s*"([^"]+)"/g)].map((m) => m[1]));
			for (const a of abbrs) expect(OSIS[a], `${file}: ${a}`).toBeDefined();
		}
	});
});

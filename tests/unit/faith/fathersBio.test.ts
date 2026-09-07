import { describe, expect, it } from 'vitest';
import { BIO_EN } from '$lib/data/fathersBio.en';
import { BIO_DE } from '$lib/data/fathersBio.de';
import { BIO_SOURCES, bioFor, hasBio, isPerson } from '$lib/data/fathersBio';
import { FATHERS } from '$lib/faith/fathers';

describe('the commentators’ lives', () => {
	it('every curated commentator has a life in both languages', () => {
		for (const f of FATHERS) {
			expect(hasBio(f.id), f.id).toBe(true);
			expect(BIO_DE[f.id], `${f.id} de`).toBeDefined();
		}
	});
	it('the German mirrors the English section for section', () => {
		for (const [id, en] of Object.entries(BIO_EN)) {
			const de = BIO_DE[id];
			for (const k of ['teaching', 'church', 'particular', 'feast', 'titles'] as const) expect(!!de[k], `${id}.${k}`).toBe(!!en[k]);
		}
	});
	it('persons carry all four sections and at least one source', () => {
		for (const id of Object.keys(BIO_EN).filter(isPerson)) {
			for (const k of ['life', 'teaching', 'church', 'particular'] as const) expect(BIO_EN[id][k]?.length, `${id}.${k}`).toBeGreaterThan(80);
			expect(BIO_SOURCES[id]?.length, `${id} sources`).toBeGreaterThan(0);
		}
	});
	it('the German avoids the Eszett, as the rest of the site does', () => {
		for (const [id, de] of Object.entries(BIO_DE)) expect(JSON.stringify(de).includes('\u00df'), id).toBe(false);
	});
	it('falls back to English for Latin readers and unknown ids', () => {
		expect(bioFor('augustine', 'de')?.lang).toBe('de');
		expect(bioFor('augustine', 'la')?.lang).toBe('en');
		expect(bioFor('augustine', 'en')?.lang).toBe('en');
		expect(bioFor('nobody', 'de')).toBeNull();
		expect(isPerson('pseudo-jerome')).toBe(false);
		expect(isPerson('aquinas')).toBe(true);
	});
});

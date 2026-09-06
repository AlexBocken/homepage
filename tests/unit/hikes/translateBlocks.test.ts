import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
	absorbEdits,
	applyOverrides,
	BlockMismatchError,
	collectUnits,
	emptyMemory,
	hashText,
	inlineToXml,
	isBalancedXml,
	renderBlocks,
	splitBlocks,
	unitKey,
	unitsToTranslate,
	xmlToInline,
	type Memory,
	type UnitTexts
} from '../../../scripts/hikeTranslate.js';

const CONTENT = path.resolve(__dirname, '../../../src/content/hikes');

const SAMPLE = `---
title: Mattstock ab Amden
date: 2026-08-22
tags: [Walensee, Gipfel]
summary: Kurzer, steiler Gipfeltag über dem Walensee.
heroAlt: Der Mattstock im Morgenlicht
---

<script>
	import HikeImage from '$lib/components/hikes/HikeImage.svelte';
</script>

## Übersicht

Ein kurzer Tag mit **viel** Aussicht und einem
[Sessellift](https://example.org/lift) als Abkürzung.
<HikeImage idx={0} />
<HikeImage idx={1} />

- Erster Punkt
- Zweiter Punkt
  mit Fortsetzung

> Ein Zitat
> über zwei Zeilen

<HikeImage src="a.jpg" alt="Ein Bild" caption="Die Bank am Weg" />

Letzter Absatz.
`;

describe('splitBlocks / renderBlocks', () => {
	it('round-trips the sample byte for byte', () => {
		expect(renderBlocks(splitBlocks(SAMPLE), new Map())).toBe(SAMPLE);
	});

	it('round-trips every hike in the repo byte for byte', () => {
		if (!existsSync(CONTENT)) return;
		const slugs = readdirSync(CONTENT, { withFileTypes: true })
			.filter((e) => e.isDirectory())
			.map((e) => e.name);
		expect(slugs.length).toBeGreaterThan(0);
		for (const slug of slugs) {
			const p = path.join(CONTENT, slug, 'index.svx');
			if (!existsSync(p)) continue;
			const src = readFileSync(p, 'utf-8');
			expect(renderBlocks(splitBlocks(src), new Map()), slug).toBe(src);
		}
	});

	it('ends an open paragraph at a component tag on the next line', () => {
		const blocks = splitBlocks(SAMPLE);
		const kinds = blocks.map((b) => b.kind);
		const para = kinds.indexOf('paragraph');
		expect(kinds[para + 1]).toBe('component');
		expect(kinds[para + 2]).toBe('component');
	});

	it('collects frontmatter values, headings, paragraphs, list items, quotes and image attributes', () => {
		const units = collectUnits(splitBlocks(SAMPLE));
		const fields = units.map((u) => u.field);
		expect(fields).toEqual([
			'fm:title',
			'fm:summary',
			'fm:heroAlt',
			'text', // heading
			'text', // paragraph
			'text', // list item 1
			'text', // list item 2
			'text', // blockquote
			'attr:alt',
			'attr:caption',
			'text' // last paragraph
		]);
		expect(units.find((u) => u.field === 'fm:tags')).toBeUndefined();
		expect(units[6].text).toBe('Zweiter Punkt\nmit Fortsetzung');
		expect(units[7].text).toBe('Ein Zitat\nüber zwei Zeilen');
	});

	it('renders replacements into every block shape and appends generated frontmatter', () => {
		const blocks = splitBlocks(SAMPLE);
		const units = collectUnits(blocks);
		const texts: UnitTexts = new Map(units.map((u) => [unitKey(u), `EN(${u.field})`]));
		const out = renderBlocks(blocks, texts, { extraFrontmatter: { translatedFrom: 'abc', machine: 'true' } });
		expect(out).toContain('title: EN(fm:title)');
		expect(out).toContain('tags: [Walensee, Gipfel]');
		expect(out).toContain('translatedFrom: abc\nmachine: true\n---');
		expect(out).toContain('## EN(text)');
		expect(out).toContain('- EN(text)');
		expect(out).toContain('> EN(text)');
		expect(out).toContain('alt="EN(attr:alt)" caption="EN(attr:caption)"');
		expect(out).toContain('<HikeImage idx={0} />');
	});

	it('hashes ignore re-wrapping but not rewording', () => {
		expect(hashText('Ein kurzer\nTag')).toBe(hashText('Ein kurzer Tag'));
		expect(hashText('Ein kurzer Tag')).not.toBe(hashText('Ein langer Tag'));
	});
});

describe('markdown ⇄ XML', () => {
	it('round-trips links, emphasis, code and author HTML', () => {
		const cases = [
			'Ein [Link](https://example.org/a?b=1&c=2) im Text.',
			'Mit **fett** und *kursiv* und `code < 3`.',
			'Der <q>Böse</q> steht <em>direkt</em> gegenüber & wartet.',
			'Zeile eins\nZeile zwei'
		];
		for (const c of cases) expect(xmlToInline(inlineToXml(c))).toBe(c);
	});

	it('produces well-formed payloads and never translates URLs', () => {
		const xml = inlineToXml('Ein [Link](https://example.org/x) mit **fett**.');
		expect(xml).toBe('Ein <md-a href="https://example.org/x">Link</md-a> mit <md-b>fett</md-b>.');
		expect(isBalancedXml(xml)).toBe(true);
	});

	it('flags a bare < and an unclosed tag', () => {
		expect(isBalancedXml(inlineToXml('Temperatur < 5 Grad'))).toBe(true); // escaped
		expect(isBalancedXml('<q>offen')).toBe(false);
		expect(isBalancedXml('a <b> c </i>')).toBe(false);
	});

	it('applies the hiking-term overrides', () => {
		expect(applyOverrides('1500 meters in altitude and «quotes»')).toBe('1500 vertical metres and “quotes”');
		expect(applyOverrides('700 metres of altitude gain on the ascent')).toBe('700 vertical metres on the ascent');
	});
});

describe('translation memory', () => {
	function memoryFor(src: string, en: (t: string) => string): { memory: Memory; deUnits: ReturnType<typeof collectUnits> } {
		const deUnits = collectUnits(splitBlocks(src));
		const memory = emptyMemory();
		for (const u of deUnits) memory.blocks[u.hash] = { de: u.text, en: en(u.text), generatedAt: '2026-09-05' };
		memory.order = deUnits.map((u) => u.hash);
		return { memory, deUnits };
	}

	it('absorbs a hand-edited block as manual and leaves the rest alone', () => {
		const { memory, deUnits } = memoryFor(SAMPLE, (t) => `EN ${t}`);
		const enUnits = deUnits.map((u) => ({ ...u, text: `EN ${u.text}` }));
		enUnits[4] = { ...enUnits[4], text: 'A short day, hand-polished.' };
		const { memory: next, absorbed } = absorbEdits(memory, enUnits, 'sample', '2026-09-06');
		expect(absorbed).toBe(1);
		expect(next.blocks[deUnits[4].hash]).toMatchObject({ en: 'A short day, hand-polished.', manual: true, editedAt: '2026-09-06' });
		expect(next.blocks[deUnits[3].hash].manual).toBeUndefined();
	});

	it('refuses when the English file lost a block, naming the first divergence', () => {
		const { memory, deUnits } = memoryFor(SAMPLE, (t) => `EN ${t}`);
		const enUnits = deUnits.map((u) => ({ ...u, text: `EN ${u.text}` })).filter((_, i) => i !== 4);
		expect(() => absorbEdits(memory, enUnits, 'sample', '2026-09-06')).toThrow(BlockMismatchError);
		try {
			absorbEdits(memory, enUnits, 'sample', '2026-09-06');
		} catch (e) {
			expect((e as Error).message).toMatch(/has 10 translatable blocks, translation memory expects 11/);
			expect((e as Error).message).toMatch(/delete translation.en.json/);
		}
	});

	it('re-translates exactly the block whose German changed', () => {
		const { memory } = memoryFor(SAMPLE, (t) => `EN ${t}`);
		const edited = SAMPLE.replace('Letzter Absatz.', 'Allerletzter Absatz.');
		const needed = unitsToTranslate(memory, collectUnits(splitBlocks(edited)), false);
		expect(needed.map((u) => u.text)).toEqual(['Allerletzter Absatz.']);
	});

	it('--force skips manual blocks, --force=all does not', () => {
		const { memory, deUnits } = memoryFor(SAMPLE, (t) => `EN ${t}`);
		memory.blocks[deUnits[0].hash].manual = true;
		expect(unitsToTranslate(memory, deUnits, 'machine')).toHaveLength(deUnits.length - 1);
		expect(unitsToTranslate(memory, deUnits, 'all')).toHaveLength(deUnits.length);
		expect(unitsToTranslate(memory, deUnits, false)).toHaveLength(0);
	});
});

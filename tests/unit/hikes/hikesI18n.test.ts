import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
	altFor,
	convertHikesPath,
	fmt,
	hikeText,
	hikesSlugFromLang,
	isHikesPath,
	langFromHikesSlug,
	m,
	tagLabel
} from '../../../src/lib/js/hikesI18n';
import { PLACE_NAME_TAGS, TAG_LABELS_EN } from '../../../src/lib/i18n/hikes/tags';

const CONTENT = path.resolve(__dirname, '../../../src/content/hikes');

describe('hikes language slugs', () => {
	it('maps the first segment to a language and back', () => {
		expect(langFromHikesSlug('hikes')).toBe('en');
		expect(langFromHikesSlug('wanderungen')).toBe('de');
		expect(langFromHikesSlug(undefined)).toBe('de');
		expect(hikesSlugFromLang('en')).toBe('hikes');
		expect(hikesSlugFromLang('de')).toBe('wanderungen');
	});

	it('recognises hikes paths without catching look-alikes', () => {
		expect(isHikesPath('/hikes')).toBe(true);
		expect(isHikesPath('/wanderungen/2026-mattstock')).toBe(true);
		expect(isHikesPath('/hikes-of-old')).toBe(false);
		expect(isHikesPath('/rezepte')).toBe(false);
	});

	it('swaps only the first segment', () => {
		expect(convertHikesPath('/hikes/2026-mattstock', 'de')).toBe('/wanderungen/2026-mattstock');
		expect(convertHikesPath('/wanderungen', 'en')).toBe('/hikes');
		expect(convertHikesPath('/hikes/route-builder', 'de')).toBe('/wanderungen/route-builder');
		expect(convertHikesPath('/wanderungen/x', 'de')).toBe('/wanderungen/x');
		expect(convertHikesPath('/rezepte', 'en')).toBe('/rezepte');
	});
});

describe('strings', () => {
	it('fills placeholders and leaves unknown ones', () => {
		expect(fmt('{n} changes', { n: 3 })).toBe('3 changes');
		expect(fmt('From {hub} by {time}', { hub: 'Chur' })).toBe('From Chur by {time}');
	});

	it('has the same keys in both languages', () => {
		expect(Object.keys(m.en).sort()).toEqual(Object.keys(m.de).sort());
	});

	it('falls back to German title, summary and alt when no English exists', () => {
		const hike = { title: 'Mattstock', summary: 'Kurz und steil', titleEn: 'Mattstock', summaryEn: undefined };
		expect(hikeText(hike, 'en')).toEqual({ title: 'Mattstock', summary: 'Kurz und steil' });
		expect(hikeText({ ...hike, summaryEn: 'Short and steep' }, 'en').summary).toBe('Short and steep');
		expect(altFor({ alt: 'Der Gipfel' }, 'en')).toBe('Der Gipfel');
		expect(altFor({ alt: 'Der Gipfel', altEn: 'The summit' }, 'en')).toBe('The summit');
		expect(altFor({ alt: 'Der Gipfel', altEn: 'The summit' }, 'de')).toBe('Der Gipfel');
	});
});

describe('tag labels', () => {
	it('translates descriptive tags and passes place names through', () => {
		expect(tagLabel('Gipfel', 'en')).toBe('Summit');
		expect(tagLabel('Gipfel', 'de')).toBe('Gipfel');
		expect(tagLabel('Walensee', 'en')).toBe('Walensee');
	});

	it('covers every tag used by a hike in the repo', () => {
		if (!existsSync(CONTENT)) return;
		const missing = new Set<string>();
		for (const e of readdirSync(CONTENT, { withFileTypes: true })) {
			if (!e.isDirectory()) continue;
			const p = path.join(CONTENT, e.name, 'index.svx');
			if (!existsSync(p)) continue;
			const tagsLine = readFileSync(p, 'utf-8').match(/^tags:\s*\[([^\]]*)\]/m);
			if (!tagsLine) continue;
			for (const raw of tagsLine[1].split(',')) {
				const tag = raw.trim().replace(/^["']|["']$/g, '');
				if (!tag) continue;
				if (!(tag in TAG_LABELS_EN) && !PLACE_NAME_TAGS.has(tag)) missing.add(tag);
			}
		}
		expect(
			[...missing],
			'add these to TAG_LABELS_EN or PLACE_NAME_TAGS in src/lib/i18n/hikes/tags.ts'
		).toEqual([]);
	});
});

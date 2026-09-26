/**
 * Pins every route-param matcher and the language-slug helpers built on the same
 * slug sets, so consolidating them into one table can be checked for drift.
 *
 * The corpus is every quoted string in the matchers and i18n helpers plus a few
 * edge cases, so a slug accidentally added to or dropped from any matcher shows up
 * as a snapshot diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as faith from '$lib/js/faithI18n';
import * as fitness from '$lib/js/fitnessI18n';
import * as recipes from '$lib/js/recipesI18n';
import * as hikes from '$lib/js/hikesI18n';

const matchers = import.meta.glob('/src/params/*.ts', { eager: true }) as Record<
	string,
	{ match: (param: string) => boolean }
>;

// Frozen from the matchers, the i18n helpers, hooks.server.ts and the service
// worker (plus edge cases) when this test was written, so moving the slugs
// elsewhere can't shrink what gets checked.
const corpus: string[] = JSON.parse(readFileSync(join(__dirname, 'slug-corpus.json'), 'utf8'));

describe('param matchers', () => {
	it('covers every matcher file', () => {
		expect(Object.keys(matchers).sort()).toMatchSnapshot();
	});

	for (const [file, mod] of Object.entries(matchers).sort(([a], [b]) => a.localeCompare(b))) {
		it(`${file} accepts exactly the same strings`, () => {
			expect(corpus.filter((s) => mod.match(s))).toMatchSnapshot();
		});
	}
});

const FAITH_LANGS = ['de', 'en', 'la'] as const;
const faithSlugFns = [
	'faithSlugFromLang', 'prayersSlug', 'rosarySlug', 'calendarSlug', 'bibleSlug',
	'katecheseSlug', 'catechismSlug', 'councilSlug', 'canonSlug', 'magisteriumSlug',
	'apologetikSlug'
] as const;

describe('faith slugs', () => {
	it('maps each language to its slugs', () => {
		const table = Object.fromEntries(
			faithSlugFns.map((fn) => [fn, FAITH_LANGS.map((l) => (faith[fn] as (l: string) => string)(l))])
		);
		expect(table).toMatchSnapshot();
	});

	it('resolves the language from a base slug', () => {
		expect(corpus.map((s) => [s, faith.langFromFaithSlug(s)])).toMatchSnapshot();
	});

	it('translates path segments and recognises katechese', () => {
		const rows = corpus.map((s) => [
			s,
			...FAITH_LANGS.map((l) => faith.translateFaithSegment(s, l)),
			faith.isKatecheseSlug(s)
		]);
		expect(rows.filter((r) => r.slice(1, 4).some((v) => v !== r[0]) || r[4])).toMatchSnapshot();
	});

	const faithPaths = [
		'/glaube', '/faith', '/fides', '/glaube/gebete', '/faith/prayers/ave-maria',
		'/glaube/rosenkranz', '/fides/rosarium', '/glaube/kalender/tridentinisch/2026/09/26',
		'/faith/calendar', '/glaube/bibel/joh/3', '/glaube/katechese/erstes-gebot',
		'/faith/catechesis', '/glaube/kkk/1234', '/faith/ccc', '/fides/cce',
		'/glaube/konzil/lg/1', '/faith/canon-law/can1', '/glaube/lehrschreiben',
		'/faith/apologetics/contra', '/glaube/apologetik/pro', '/glaube/angelus',
		'/glaube/unknown-segment', '/faith/prayers?latin=0', '/glaube/gebete#x'
	];

	it('converts whole paths between languages', () => {
		expect(
			faithPaths.map((p) => [p, ...FAITH_LANGS.map((l) => faith.convertFaithPath(p, l))])
		).toMatchSnapshot();
	});

	it('lists the faith bases', () => {
		expect(faith.FAITH_BASES).toMatchSnapshot();
	});
});

describe('fitness slugs', () => {
	const paths = [
		'/fitness', '/fitness/stats', '/fitness/statistik', '/fitness/workout',
		'/fitness/training', '/fitness/workout/active', '/fitness/training/aktiv',
		'/fitness/history/abc', '/fitness/verlauf/abc', '/fitness/exercises',
		'/fitness/uebungen', '/fitness/nutrition/2026-09-26', '/fitness/ernaehrung',
		'/fitness/checkin', '/fitness/segments', '/fitness/stats/body', '/other'
	];

	it('builds the slug set for each language', () => {
		expect({ de: fitness.fitnessSlugs('de'), en: fitness.fitnessSlugs('en') }).toMatchSnapshot();
	});

	it('detects the language and converts paths', () => {
		expect(
			paths.map((p) => [
				p,
				fitness.detectFitnessLang(p),
				fitness.convertFitnessPath(p, 'de'),
				fitness.convertFitnessPath(p, 'en')
			])
		).toMatchSnapshot();
	});
});

describe('recipe and hike slugs', () => {
	it('map both ways', () => {
		expect({
			recipes: corpus.map((s) => [s, recipes.langFromRecipeSlug(s)]).filter(([, l]) => l !== 'de'),
			recipeSlugs: [recipes.recipeSlugFromLang('de'), recipes.recipeSlugFromLang('en')],
			hikes: corpus.map((s) => [s, hikes.langFromHikesSlug(s)]).filter(([, l]) => l !== 'de'),
			hikeSlugs: [hikes.hikesSlugFromLang('de'), hikes.hikesSlugFromLang('en')]
		}).toMatchSnapshot();
	});

	it('convert hike paths', () => {
		const paths = ['/hikes', '/wanderungen', '/hikes/2021-alta-via-1', '/wanderungen/x?y=1', '/rezepte'];
		expect(
			paths.map((p) => [
				p,
				hikes.isHikesPath(p),
				hikes.convertHikesPath(p, 'de'),
				hikes.convertHikesPath(p, 'en')
			])
		).toMatchSnapshot();
	});
});

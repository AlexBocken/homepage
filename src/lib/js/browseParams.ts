/**
 * The recipe listing's filter state, as a query string.
 *
 * The listing already wrote a few facets into the address bar and kept the rest in
 * memory, so a reload or a back-button return silently dropped the months, the
 * favourites toggle, the ordering and the whole nutrition filter — the listing came
 * back looking like the one you left, minus half of what you had asked it for.
 *
 * One place owns the round trip in both directions, so a facet added to the rail
 * cannot be forgotten by the reader or the writer alone. Names are kept short
 * because this string ends up in shared links, and the pre-existing ones (`q`,
 * `category`, `tag`, `season`) are kept exactly as they were: they are in links
 * elsewhere on the site.
 *
 * Defaults are never written. An untouched filter contributes nothing, so a plain
 * listing has a plain URL, and "is anything filtered?" is just "is the string empty?".
 */

import { MACRO_FILTER_DEFAULTS, MACRO_KCAL_CEILING, type MacroFilter } from './recipeMacros';
import type { RecipeBrowse, RecipeSort } from './recipeBrowse.svelte';

const SORTS = ['season', 'alpha', 'shuffle'] as const;

/** `min-max`, written only when the pair is narrower than the full range. */
function range(min: number, max: number, defMin: number, defMax: number): string | null {
	if (min === defMin && max === defMax) return null;
	return `${min}-${max}`;
}

function parseRange(v: string | null, defMin: number, defMax: number): [number, number] {
	if (!v) return [defMin, defMax];
	const [a, b] = v.split('-');
	const lo = Number(a);
	const hi = Number(b);
	return [Number.isFinite(lo) ? lo : defMin, Number.isFinite(hi) ? hi : defMax];
}

/** Everything the rail can express, as URL parameters. */
export function browseToParams(browse: RecipeBrowse): URLSearchParams {
	const p = new URLSearchParams();
	const d = MACRO_FILTER_DEFAULTS;
	const m = browse.macro;

	if (browse.query.trim()) p.set('q', browse.query.trim());
	if (browse.category) p.set('category', browse.category);
	for (const tag of [...browse.tags].sort()) p.append('tag', tag);
	for (const month of [...browse.months].sort((a, b) => a - b)) p.append('month', String(month));
	if (browse.inSeasonOnly) p.set('season', 'now');
	if (browse.favoritesOnly) p.set('fav', '1');
	if (browse.sort !== 'season') p.set('sort', browse.sort);

	const protein = range(m.proteinMin, m.proteinMax, d.proteinMin, d.proteinMax);
	const fat = range(m.fatMin, m.fatMax, d.fatMin, d.fatMax);
	const carbs = range(m.carbsMin, m.carbsMax, d.carbsMin, d.carbsMax);
	const kcal = range(m.kcalMin, m.kcalMax, d.kcalMin, d.kcalMax);
	if (protein) p.set('p', protein);
	if (fat) p.set('f', fat);
	if (carbs) p.set('c', carbs);
	if (kcal) p.set('kcal', kcal);
	// Only the non-default direction is written: recipes whose nutrition was never
	// calculated are included unless someone says otherwise.
	if (!m.includeUnknown) p.set('unknown', '0');

	return p;
}

/**
 * Apply a query string to a browse instance, replacing whatever it held.
 *
 * Resets first, so applying an empty string is how the listing returns to unfiltered:
 * whatever the string does not say, the listing does not have.
 */
export function applyParamsToBrowse(browse: RecipeBrowse, params: URLSearchParams): void {
	browse.reset();

	browse.query = params.get('q') ?? '';
	browse.category = params.get('category');
	for (const tag of params.getAll('tag')) browse.tags.add(tag);
	for (const month of params.getAll('month')) {
		const n = Number(month);
		if (Number.isInteger(n) && n >= 1 && n <= 12) browse.months.add(n);
	}
	browse.inSeasonOnly = params.get('season') === 'now';
	browse.favoritesOnly = params.get('fav') === '1';

	// Set either way, unlike `browse.reset()`, which deliberately leaves the ordering
	// alone when the rail is cleared: this function reproduces a string exactly, and a
	// string with no `sort` means the default one.
	const sort = params.get('sort');
	browse.sort = sort && (SORTS as readonly string[]).includes(sort) ? (sort as RecipeSort) : 'season';

	const d = MACRO_FILTER_DEFAULTS;
	const m = browse.macro as MacroFilter;
	[m.proteinMin, m.proteinMax] = parseRange(params.get('p'), d.proteinMin, d.proteinMax);
	[m.fatMin, m.fatMax] = parseRange(params.get('f'), d.fatMin, d.fatMax);
	[m.carbsMin, m.carbsMax] = parseRange(params.get('c'), d.carbsMin, d.carbsMax);
	[m.kcalMin, m.kcalMax] = parseRange(params.get('kcal'), d.kcalMin, MACRO_KCAL_CEILING);
	m.includeUnknown = params.get('unknown') !== '0';
}

/** Whether a query string carries any filter this module understands. */
export function hasBrowseParams(params: URLSearchParams): boolean {
	for (const key of ['q', 'category', 'tag', 'month', 'season', 'fav', 'sort', 'p', 'f', 'c', 'kcal', 'unknown']) {
		if (params.has(key)) return true;
	}
	return false;
}

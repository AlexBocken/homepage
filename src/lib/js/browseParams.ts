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

/**
 * A range from any of its spellings: the compact `p=25-100` this module writes, the
 * separate `pmin=25&pmax=100` a plain HTML form can produce, or `pminneg=-25` from
 * the script-free lower-bound slider, whose axis is reversed so the browser's own
 * fill lands on the side the filter keeps (see the rail). Its value arrives negated,
 * which is the whole reason it has a name of its own.
 *
 * The second exists for the rail's script-free fallback: a form submits one field
 * per input, so it cannot build the joined form, and asking it to would mean asking
 * for JavaScript. Both are read; only the compact one is ever written, so links stay
 * short and there is one canonical spelling.
 */
function parseRange(
	params: URLSearchParams,
	key: string,
	defMin: number,
	defMax: number,
): [number, number] {
	const joined = params.get(key);
	if (joined) {
		const [a, b] = joined.split('-');
		const lo = Number(a);
		const hi = Number(b);
		return [Number.isFinite(lo) ? lo : defMin, Number.isFinite(hi) ? hi : defMax];
	}
	const negated = Number(params.get(`${key}minneg`));
	const lo = params.has(`${key}minneg`) ? -negated : Number(params.get(`${key}min`));
	const hi = Number(params.get(`${key}max`));
	const hasLo = params.has(`${key}min`) || params.has(`${key}minneg`);
	const min = hasLo && Number.isFinite(lo) ? lo : defMin;
	const max = params.has(`${key}max`) && Number.isFinite(hi) ? hi : defMax;
	// The script-free form is two separate sliders, which can be dragged past each
	// other. A crossed pair means the bounds were entered the other way round, not
	// that nothing should match — read it as the range it describes.
	return min <= max ? [min, max] : [max, min];
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
	[m.proteinMin, m.proteinMax] = parseRange(params, 'p', d.proteinMin, d.proteinMax);
	[m.fatMin, m.fatMax] = parseRange(params, 'f', d.fatMin, d.fatMax);
	[m.carbsMin, m.carbsMax] = parseRange(params, 'c', d.carbsMin, d.carbsMax);
	[m.kcalMin, m.kcalMax] = parseRange(params, 'kcal', d.kcalMin, MACRO_KCAL_CEILING);
	m.includeUnknown = params.get('unknown') !== '0';
}

const RANGE_KEYS = ['p', 'f', 'c', 'kcal'] as const;

/** The spellings only a plain form produces — never written, always accepted. */
const FORM_RANGE_KEYS = RANGE_KEYS.flatMap((k) => [`${k}min`, `${k}minneg`, `${k}max`]);

const FILTER_KEYS = [
	'q', 'category', 'tag', 'month', 'season', 'fav', 'sort',
	'p', 'f', 'c', 'kcal', 'unknown',
	...FORM_RANGE_KEYS,
];

/**
 * The same filters written the one canonical way, or null when they already are.
 *
 * A form submits one field per input, so the script-free rail lands on
 * `?pminneg=-25&pmax=60`; nobody should have to look at that, or share it. The
 * listing redirects to the compact spelling once, which also means a bookmark taken
 * from the fallback is the same URL the app itself would produce.
 */
export function canonicalParams(params: URLSearchParams): URLSearchParams | null {
	if (!FORM_RANGE_KEYS.some((k) => params.has(k))) return null;

	const next = new URLSearchParams(params);
	const d = MACRO_FILTER_DEFAULTS;
	const bounds: Record<string, [number, number]> = {
		p: parseRange(params, 'p', d.proteinMin, d.proteinMax),
		f: parseRange(params, 'f', d.fatMin, d.fatMax),
		c: parseRange(params, 'c', d.carbsMin, d.carbsMax),
		kcal: parseRange(params, 'kcal', d.kcalMin, MACRO_KCAL_CEILING),
	};
	const defaults: Record<string, [number, number]> = {
		p: [d.proteinMin, d.proteinMax],
		f: [d.fatMin, d.fatMax],
		c: [d.carbsMin, d.carbsMax],
		kcal: [d.kcalMin, MACRO_KCAL_CEILING],
	};

	for (const key of RANGE_KEYS) {
		next.delete(`${key}min`);
		next.delete(`${key}minneg`);
		next.delete(`${key}max`);
		next.delete(key);
		const [min, max] = bounds[key];
		const [defMin, defMax] = defaults[key];
		if (min !== defMin || max !== defMax) next.set(key, `${min}-${max}`);
	}
	return next;
}

/** Whether a query string carries any filter this module understands. */
export function hasBrowseParams(params: URLSearchParams): boolean {
	return FILTER_KEYS.some((key) => params.has(key));
}

/**
 * The same filters with one value flipped — what a facet chip links to when there is
 * no script to handle its click.
 *
 * Repeated keys (`tag`, `month`) toggle the one value; single keys (`category`,
 * `sort`) are set, or removed when they already hold that value, so the chip that
 * turned a filter on is also the one that turns it off.
 */
export function toggledParams(
	params: URLSearchParams,
	key: string,
	value: string,
	repeated = false,
): URLSearchParams {
	const next = new URLSearchParams(params);
	if (repeated) {
		const values = next.getAll(key);
		next.delete(key);
		const kept = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
		for (const v of kept.sort()) next.append(key, v);
		return next;
	}
	if (next.get(key) === value) next.delete(key);
	else next.set(key, value);
	return next;
}

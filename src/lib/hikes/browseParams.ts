/**
 * The hikes listing's filter state, as a query string.
 *
 * The listing kept its filters in memory and wrote only `tag` to the address bar,
 * which was enough while every control needed script to work. Without script none
 * of them did anything: the bar rendered, the panel would not open, and the grid
 * showed all sixteen hikes whatever you clicked.
 *
 * Now the URL is the interface a script-free browser uses, so one place owns the
 * round trip in both directions — a facet added to the bar cannot be understood by
 * the reader and forgotten by the writer. `tag` keeps its name: `/hikes?tag=winter`
 * is linked from every detail page's tag chips.
 *
 * Defaults are never written. An untouched filter contributes nothing, so a plain
 * listing has a plain URL and "is anything filtered?" is "is the string empty?".
 */

import { SvelteSet } from 'svelte/reactivity';
import type { Difficulty, HikeManifestEntry, HikeTravelTable, HubId } from '$types/hikes';
import { DEFAULT_HUB_ID, isHubId } from './hubs';
import { hikeFilterBounds, type Bounds, type HikeFilterBounds } from './filterBounds';

export type HikesFilter = {
	minDistanceKm: number;
	maxDistanceKm: number;
	minDurationMin: number;
	maxDurationMin: number;
	minGainM: number;
	maxGainM: number;
	minLossM: number;
	maxLossM: number;
	difficulties: SvelteSet<Difficulty>;
	regions: SvelteSet<string>;
	/** Namespaced area values — canton, Bundesland or country. See `resolveHikeArea`. */
	areas: SvelteSet<string>;
	tags: SvelteSet<string>;
	/** Show only hikes whose recommended season covers the current month. */
	inSeasonOnly: boolean;
	/** Public-transport travel time from `hub`, in minutes. */
	minTravelMin: number;
	maxTravelMin: number;
	/**
	 * Departure hub the travel range is measured from, when the reader has
	 * picked one here. `null` means "whatever the server resolved for this
	 * visitor" (their cookie, else GeoIP2, else Zürich) — which is not a value
	 * this module can know, and not one worth writing into every URL. See
	 * `hubFor` in `$lib/hikes/travelHub`.
	 */
	hub: HubId | null;
};

/** Range keys, short because they end up in shared links. */
export const RANGE_KEYS = ['dist', 'dur', 'up', 'down', 'trav'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

const VALID_DIFFICULTIES: readonly Difficulty[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

/** `min-max`, written only when the pair is narrower than the data's own range. */
function range(min: number, max: number, b: Bounds): string | null {
	if (min <= b.min && max >= b.max) return null;
	return `${min}-${max}`;
}

/**
 * A range from any of its spellings: the compact `dist=4-12` this module writes, the
 * separate `distmin=4&distmax=12` a plain HTML form produces, or `distminneg=-4` from
 * the script-free lower-bound slider, whose axis is reversed so the browser's own fill
 * lands on the side the filter keeps (see the bar). Its value arrives negated, which
 * is the whole reason it has a name of its own.
 *
 * Only the compact spelling is ever written, so links stay short and there is one
 * canonical form; `canonicalParams` redirects the others to it.
 */
function parseRange(params: URLSearchParams, key: RangeKey, b: Bounds): [number, number] {
	const joined = params.get(key);
	if (joined) {
		const [a, z] = joined.split('-');
		const lo = Number(a);
		const hi = Number(z);
		return clampPair(Number.isFinite(lo) ? lo : b.min, Number.isFinite(hi) ? hi : b.max, b);
	}
	const negated = Number(params.get(`${key}minneg`));
	const rawLo = params.has(`${key}minneg`) ? -negated : Number(params.get(`${key}min`));
	const rawHi = Number(params.get(`${key}max`));
	const hasLo = params.has(`${key}min`) || params.has(`${key}minneg`);
	const lo = hasLo && Number.isFinite(rawLo) ? rawLo : b.min;
	const hi = params.has(`${key}max`) && Number.isFinite(rawHi) ? rawHi : b.max;
	return clampPair(lo, hi, b);
}

/**
 * The script-free form is two separate sliders, which can be dragged past each other.
 * A crossed pair describes its range backwards rather than asking for nothing, so it
 * is read that way round. Bounds are clamped because the data — and with it the track
 * extents — changes as hikes are added, and an old link should still mean something.
 */
function clampPair(lo: number, hi: number, b: Bounds): [number, number] {
	const min = Math.max(b.min, Math.min(lo, hi));
	const max = Math.min(b.max, Math.max(lo, hi));
	return [Math.min(min, max), Math.max(min, max)];
}

/** Everything the filter bar can express, as URL parameters. */
export function filterToParams(filter: HikesFilter, bounds: HikeFilterBounds): URLSearchParams {
	const p = new URLSearchParams();

	if (filter.inSeasonOnly) p.set('season', 'now');
	for (const d of [...filter.difficulties].sort()) p.append('d', d);
	for (const a of [...filter.areas].sort()) p.append('area', a);
	for (const r of [...filter.regions].sort()) p.append('region', r);
	for (const t of [...filter.tags].sort()) p.append('tag', t);

	// Written before the ranges so a shared link reads hub-then-range, and
	// because the hub is what gives the travel range its meaning.
	if (filter.hub) p.set('hub', filter.hub);

	const dist = range(filter.minDistanceKm, filter.maxDistanceKm, bounds.distance);
	const dur = range(filter.minDurationMin, filter.maxDurationMin, bounds.duration);
	const up = range(filter.minGainM, filter.maxGainM, bounds.gain);
	const down = range(filter.minLossM, filter.maxLossM, bounds.loss);
	if (dist) p.set('dist', dist);
	if (dur) p.set('dur', dur);
	if (up) p.set('up', up);
	if (down) p.set('down', down);
	const trav = range(filter.minTravelMin, filter.maxTravelMin, bounds.travel);
	if (trav) p.set('trav', trav);

	return p;
}

/** The filter those parameters describe, with anything absent left wide open. */
export function paramsToFilter(params: URLSearchParams, bounds: HikeFilterBounds): HikesFilter {
	const [minDistanceKm, maxDistanceKm] = parseRange(params, 'dist', bounds.distance);
	const [minDurationMin, maxDurationMin] = parseRange(params, 'dur', bounds.duration);
	const [minGainM, maxGainM] = parseRange(params, 'up', bounds.gain);
	const [minLossM, maxLossM] = parseRange(params, 'down', bounds.loss);
	const [minTravelMin, maxTravelMin] = parseRange(params, 'trav', bounds.travel);

	return {
		minTravelMin,
		maxTravelMin,
		hub: hubFromParams(params),
		minDistanceKm,
		maxDistanceKm,
		minDurationMin,
		maxDurationMin,
		minGainM,
		maxGainM,
		minLossM,
		maxLossM,
		difficulties: new SvelteSet(
			params.getAll('d').filter((d): d is Difficulty => VALID_DIFFICULTIES.includes(d as Difficulty))
		),
		regions: new SvelteSet(params.getAll('region').filter(Boolean)),
		areas: new SvelteSet(params.getAll('area').filter(Boolean)),
		tags: new SvelteSet(params.getAll('tag').filter(Boolean)),
		inSeasonOnly: params.get('season') === 'now'
	};
}

/** A filter with every range at its data bound and nothing selected. */
export function emptyFilter(bounds: HikeFilterBounds): HikesFilter {
	return paramsToFilter(new URLSearchParams(), bounds);
}

/**
 * The canonical spelling of a form submission, or `null` when the URL is already
 * canonical. The range form submits one field per input, so it arrives as
 * `?distminneg=-4&distmax=12`; the listing redirects that to `?dist=4-12` before
 * rendering, so nobody has to look at the negated form or share it.
 *
 * Bounds come from the manifest rather than the caller because this runs in `load`,
 * before the page has derived anything.
 */
export function canonicalParams(
	params: URLSearchParams,
	hikes: HikeManifestEntry[],
	travel?: HikeTravelTable | null
): URLSearchParams | null {
	const spelled = RANGE_KEYS.some(
		(k) => params.has(`${k}min`) || params.has(`${k}max`) || params.has(`${k}minneg`)
	);
	if (!spelled) return null;

	// The travel range is measured against the hub the form carried along; with
	// none, the same default the page falls back to. Getting this wrong would
	// canonicalise a narrowed range into "not narrowed" or vice versa.
	const bounds = hikeFilterBounds(hikes, hubFromParams(params) ?? DEFAULT_HUB_ID, travel);
	const next = new URLSearchParams(params);
	for (const key of RANGE_KEYS) {
		const [lo, hi] = parseRange(params, key, bounds[boundsKey(key)]);
		next.delete(`${key}min`);
		next.delete(`${key}minneg`);
		next.delete(`${key}max`);
		next.delete(key);
		const compact = range(lo, hi, bounds[boundsKey(key)]);
		if (compact) next.set(key, compact);
	}
	return next;
}

/** Range key → the bounds it is measured against. */
export function boundsKey(key: RangeKey): keyof HikeFilterBounds {
	return key === 'dist'
		? 'distance'
		: key === 'dur'
			? 'duration'
			: key === 'up'
				? 'gain'
				: key === 'trav'
					? 'travel'
					: 'loss';
}

/** The hub named in a URL, or `null` when it names none — including when it
 * names something that is not one of ours. */
export function hubFromParams(params: URLSearchParams): HubId | null {
	const raw = params.get('hub');
	return isHubId(raw) ? raw : null;
}

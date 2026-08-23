import { describe, it, expect } from 'vitest';
import {
	filterToParams,
	paramsToFilter,
	emptyFilter,
	canonicalParams
} from '../../../src/lib/hikes/browseParams';
import { hikeFilterBounds } from '../../../src/lib/hikes/filterBounds';
import type { HikeManifestEntry } from '../../../src/types/hikes';

// Three hikes are enough to give every range a floor and a ceiling: distance
// 4–20 km, duration 60–300 min, gain 200–1600 m, loss 200–1600 m, snapped
// outward to whole steps by `alignBounds`.
const hikes = [
	{ distanceKm: 4, durationMin: 60, elevationGainM: 200, elevationLossM: 200 },
	{ distanceKm: 12, durationMin: 180, elevationGainM: 900, elevationLossM: 900 },
	{ distanceKm: 20, durationMin: 300, elevationGainM: 1600, elevationLossM: 1600 }
] as HikeManifestEntry[];

const bounds = hikeFilterBounds(hikes);
const params = (s: string) => new URLSearchParams(s);

describe('filterToParams', () => {
	it('writes nothing for an untouched filter', () => {
		expect(filterToParams(emptyFilter(bounds), bounds).toString()).toBe('');
	});

	it('carries every facet the bar can set', () => {
		const f = emptyFilter(bounds);
		f.inSeasonOnly = true;
		f.difficulties.add('T3');
		f.areas.add('canton:sz');
		f.regions.add('Sattel');
		f.tags.add('Panorama');
		f.minDistanceKm = 8;

		const p = filterToParams(f, bounds);
		expect(p.get('season')).toBe('now');
		expect(p.getAll('d')).toEqual(['T3']);
		expect(p.getAll('area')).toEqual(['canton:sz']);
		expect(p.getAll('region')).toEqual(['Sattel']);
		expect(p.getAll('tag')).toEqual(['Panorama']);
		expect(p.get('dist')).toBe('8-20');
	});

	it('leaves a range out while it still spans its data', () => {
		const f = emptyFilter(bounds);
		f.minDistanceKm = bounds.distance.min;
		f.maxDistanceKm = bounds.distance.max;
		expect(filterToParams(f, bounds).has('dist')).toBe(false);
	});

	it('round-trips through the URL', () => {
		const f = emptyFilter(bounds);
		f.difficulties.add('T2');
		f.tags.add('Panorama');
		f.minGainM = 600;
		f.maxGainM = 1200;

		const back = paramsToFilter(filterToParams(f, bounds), bounds);
		expect([...back.difficulties]).toEqual(['T2']);
		expect([...back.tags]).toEqual(['Panorama']);
		expect(back.minGainM).toBe(600);
		expect(back.maxGainM).toBe(1200);
	});
});

describe('paramsToFilter', () => {
	it('ignores a difficulty that is not one', () => {
		expect([...paramsToFilter(params('d=T3&d=T9'), bounds).difficulties]).toEqual(['T3']);
	});

	it('keeps an old link inside the bounds the data has now', () => {
		// Written when the listing still held a 40 km hike.
		const f = paramsToFilter(params('dist=8-40'), bounds);
		expect(f.minDistanceKm).toBe(8);
		expect(f.maxDistanceKm).toBe(bounds.distance.max);
	});

	it('reads the form spelling, including the negated lower bound', () => {
		const f = paramsToFilter(params('distminneg=-8&distmax=16'), bounds);
		expect(f.minDistanceKm).toBe(8);
		expect(f.maxDistanceKm).toBe(16);
	});

	it('reads crossed bounds as the range they describe', () => {
		// Two separate sliders can be dragged past each other; that asks for
		// 8–16, not for nothing.
		const f = paramsToFilter(params('distmin=16&distmax=8'), bounds);
		expect(f.minDistanceKm).toBe(8);
		expect(f.maxDistanceKm).toBe(16);
	});
});

describe('canonicalParams', () => {
	it('leaves a URL the app itself wrote alone', () => {
		expect(canonicalParams(params('d=T3&dist=8-16'), hikes)).toBeNull();
	});

	it('rewrites the form spelling and keeps the other filters', () => {
		const next = canonicalParams(params('d=T3&distminneg=-8&distmax=16'), hikes);
		expect(next?.get('dist')).toBe('8-16');
		expect(next?.getAll('d')).toEqual(['T3']);
		expect(next?.has('distminneg')).toBe(false);
		expect(next?.has('distmax')).toBe(false);
	});

	it('drops a submitted range that asks for everything', () => {
		const next = canonicalParams(params(`distminneg=-${bounds.distance.min}&distmax=${bounds.distance.max}`), hikes);
		expect(next?.toString()).toBe('');
	});
});

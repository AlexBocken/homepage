import { describe, it, expect } from 'vitest';
import {
	HUBS,
	HUB_CATCHMENT_KM,
	hubForLocation,
	isHubId,
	nearestHub
} from '../../../src/lib/hikes/hubs';
import { resolveHub } from '../../../src/lib/server/geoip';
import { formatTravelMinutes } from '../../../src/lib/hikes/travel';
import { emptyFilter, filterToParams, hubFromParams } from '../../../src/lib/hikes/browseParams';
import { hikeFilterBounds } from '../../../src/lib/hikes/filterBounds';
import type { HikeManifestEntry } from '../../../src/types/hikes';

const headers = (init: Record<string, string> = {}) => new Headers(init);

describe('nearestHub', () => {
	it.each([
		['Zürich Oerlikon', 47.411, 8.544, 'zurich'],
		['Thun', 46.758, 7.63, 'bern'],
		['Liestal', 47.484, 7.735, 'basel'],
		['Davos', 46.803, 9.836, 'chur'],
		['Laax', 46.808, 9.259, 'flims'],
		['Locarno', 46.171, 8.795, 'lugano'],
		['Altdorf UR', 46.881, 8.644, 'luzern'],
		['Appenzell', 47.331, 9.409, 'stgallen'],
		['Vevey', 46.462, 6.843, 'lausanne'],
		['Nyon', 46.383, 6.239, 'geneve']
	])('picks %s → %s', (_place, lat, lng, expected) => {
		expect(nearestHub(lat, lng).hub.id).toBe(expected);
	});

	it('leaves the catchment empty for somewhere no hub serves', () => {
		// London: a hub is still "nearest", but nobody there is 30 minutes from
		// Basel, and saying so would be worse than saying nothing.
		expect(nearestHub(51.5, -0.13).km).toBeGreaterThan(HUB_CATCHMENT_KM);
		expect(hubForLocation(51.5, -0.13)).toBeNull();
	});

	it('covers the far corners of Switzerland', () => {
		// Well outside any hub's own agglomeration, and both must still resolve —
		// the catchment is what decides whether an estimate is shown at all, so a
		// hole in it silently blanks a region.
		expect(hubForLocation(46.19, 9.02)?.id).toBe('lugano'); // Bellinzona
		expect(hubForLocation(46.62, 8.6)?.id).toBeTruthy(); // Andermatt
		expect(hubForLocation(46.227, 7.36)?.id).toBeTruthy(); // Sion
		expect(hubForLocation(46.8, 7.151)?.id).toBe('bern'); // Fribourg
	});
});

describe('Flims', () => {
	it('charges no access time, unlike the rail hubs', () => {
		// The stations serve whole agglomerations, so getting to the platform is
		// its own trip. Flims Waldhaus Promenada is a village bus stop: its only
		// users are already standing at it.
		const flims = HUBS.find((h) => h.id === 'flims');
		expect(flims?.accessMin).toBe(0);
		for (const hub of HUBS.filter((h) => h.id !== 'flims')) {
			expect(hub.accessMin).toBe(30);
		}
	});
});

describe('resolveHub', () => {
	it('falls back to Zürich with no headers and no cookie', () => {
		expect(resolveHub(headers(), null)).toMatchObject({ id: 'zurich', source: 'default' });
	});

	it('uses the GeoIP2 headers nginx sets', () => {
		const r = resolveHub(headers({ 'x-geo-lat': '47.55', 'x-geo-lon': '7.59' }), null);
		expect(r).toMatchObject({ id: 'basel', source: 'geoip' });
	});

	it('lets the reader override the lookup', () => {
		const r = resolveHub(headers({ 'x-geo-lat': '47.55', 'x-geo-lon': '7.59' }), 'chur');
		expect(r).toMatchObject({ id: 'chur', source: 'cookie' });
	});

	it('lets ?hub= override the cookie, for the script-free picker', () => {
		expect(resolveHub(headers(), 'chur', 'bern').id).toBe('bern');
	});

	it('ignores a cookie or param that is not a hub', () => {
		expect(resolveHub(headers(), 'zürich hb').id).toBe('zurich');
		expect(resolveHub(headers(), null, '../../etc/passwd').source).toBe('default');
		expect(isHubId('nowhere')).toBe(false);
	});

	it('ignores unusable header values rather than trusting a NaN', () => {
		expect(resolveHub(headers({ 'x-geo-lat': '', 'x-geo-lon': '' }), null).source).toBe('default');
		expect(resolveHub(headers({ 'x-geo-lat': 'abc', 'x-geo-lon': '7.59' }), null).source).toBe(
			'default'
		);
		expect(resolveHub(headers({ 'x-geo-lat': '947.55', 'x-geo-lon': '7.59' }), null).source).toBe(
			'default'
		);
	});

	it('keeps the country around without letting it decide', () => {
		// Konstanz is German, and sits closer to St. Gallen than to anything on
		// its own side of the border. The country is recorded and ignored.
		const r = resolveHub(
			headers({ 'x-geo-lat': '47.66', 'x-geo-lon': '9.18', 'x-geo-country': 'DE' }),
			null
		);
		expect(r).toMatchObject({ id: 'stgallen', source: 'geoip', country: 'DE' });
	});
});

describe('formatTravelMinutes', () => {
	it('reads as an estimate, not a timetable', () => {
		expect(formatTravelMinutes(45)).toBe('45 min');
		expect(formatTravelMinutes(47)).toBe('45 min');
		expect(formatTravelMinutes(60)).toBe('1 h');
		expect(formatTravelMinutes(133)).toBe('2 h 15');
		expect(formatTravelMinutes(238)).toBe('4 h');
	});
});

describe('the hub in the URL', () => {
	const bounds = hikeFilterBounds([] as HikeManifestEntry[]);

	it('is read back only when it names a hub we have', () => {
		expect(hubFromParams(new URLSearchParams('hub=lugano'))).toBe('lugano');
		expect(hubFromParams(new URLSearchParams('hub=Lugano'))).toBeNull();
		expect(hubFromParams(new URLSearchParams('hub=milano'))).toBeNull();
		expect(hubFromParams(new URLSearchParams(''))).toBeNull();
	});

	it('stays out of the address bar until the reader picks one', () => {
		// The resolved hub (cookie / GeoIP2) is not the filter's to write —
		// baking it into every URL would make a plain listing look filtered and
		// pin a shared link to the sharer's home station.
		const filter = emptyFilter(bounds);
		expect(filterToParams(filter, bounds).toString()).toBe('');

		filter.hub = 'chur';
		expect(filterToParams(filter, bounds).get('hub')).toBe('chur');
	});

	it('carries the travel range alongside it', () => {
		const filter = emptyFilter(bounds);
		filter.hub = 'bern';
		filter.maxTravelMin = bounds.travel.max - 15;
		const params = filterToParams(filter, bounds);
		expect(params.get('hub')).toBe('bern');
		expect(params.get('trav')).toBeTruthy();
	});
});

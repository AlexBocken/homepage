import { describe, it, expect } from 'vitest';
import { conditionFromWmoCode, trackAverage } from '$lib/fitness/weather';
import { weatherUrls, pickHour } from '$lib/server/weather';

// The parts of the weather lookup that must be right without a network: which point and
// hour a run is described by, which endpoint answers for a given age, how a provider's
// response is reduced to one reading, and how WMO codes collapse to conditions.
// The HTTP call itself is deliberately untested here — it is a thin wrapper around these.

describe('conditionFromWmoCode', () => {
	it('maps the WMO groups Open-Meteo returns', () => {
		expect(conditionFromWmoCode(0)).toBe('clear');
		// 1 and 2 are different skies to WMO, and are named differently by forecasts in
		// both languages — they must not collapse into one label.
		expect(conditionFromWmoCode(1)).toBe('mainly_clear');
		expect(conditionFromWmoCode(2)).toBe('partly_cloudy');
		expect(conditionFromWmoCode(3)).toBe('cloudy');
		expect(conditionFromWmoCode(45)).toBe('fog');
		expect(conditionFromWmoCode(48)).toBe('fog');
		expect(conditionFromWmoCode(53)).toBe('drizzle');
		expect(conditionFromWmoCode(63)).toBe('rain');
		expect(conditionFromWmoCode(73)).toBe('snow');
		expect(conditionFromWmoCode(81)).toBe('showers');
		expect(conditionFromWmoCode(95)).toBe('thunderstorm');
	});

	it('folds freezing variants into their wet parent and snow showers into snow', () => {
		expect(conditionFromWmoCode(56)).toBe('drizzle');
		expect(conditionFromWmoCode(57)).toBe('drizzle');
		expect(conditionFromWmoCode(66)).toBe('rain');
		expect(conditionFromWmoCode(67)).toBe('rain');
		expect(conditionFromWmoCode(85)).toBe('snow');
		expect(conditionFromWmoCode(86)).toBe('snow');
	});

	it('falls back to overcast for a code it does not know', () => {
		// The raw code is stored alongside, so an unmapped one is recoverable.
		expect(conditionFromWmoCode(4)).toBe('cloudy');
		expect(conditionFromWmoCode(999)).toBe('cloudy');
	});
});

describe('trackAverage', () => {
	const T0 = Date.parse('2026-08-04T17:00:00Z');

	it('takes the mean position and the middle of the time span', () => {
		const at = trackAverage([
			{ lat: 47.0, lng: 8.0, timestamp: T0 },
			{ lat: 47.2, lng: 8.4, timestamp: T0 + 60 * 60_000 }
		]);
		expect(at?.lat).toBeCloseTo(47.1, 6);
		expect(at?.lng).toBeCloseTo(8.2, 6);
		// Mid-time, not start: a run that set off at 19:00 is mostly run later.
		expect(at?.time.toISOString()).toBe('2026-08-04T17:30:00.000Z');
	});

	it('reads the span from the extremes, not the array order', () => {
		const at = trackAverage([
			{ lat: 47, lng: 8, timestamp: T0 + 90 * 60_000 },
			{ lat: 47, lng: 8, timestamp: T0 },
			{ lat: 47, lng: 8, timestamp: T0 + 30 * 60_000 }
		]);
		expect(at?.time.toISOString()).toBe('2026-08-04T17:45:00.000Z');
	});

	it('ignores points with unusable coordinates', () => {
		const at = trackAverage([
			{ lat: 47, lng: 8, timestamp: T0 },
			// A dropped fix must not drag the average to the Atlantic.
			{ lat: NaN, lng: 8, timestamp: T0 + 1000 } as any
		]);
		expect(at?.lat).toBe(47);
	});

	it('has nothing to say about a session without a track', () => {
		expect(trackAverage([])).toBeNull();
		expect(trackAverage(null)).toBeNull();
	});
});

describe('weatherUrls', () => {
	const now = new Date('2026-08-04T12:00:00Z');

	it('asks the forecast endpoint, alone, for a run just finished', () => {
		const urls = weatherUrls(47.37, 8.54, new Date('2026-08-04T09:00:00Z'), now);
		expect(urls).toHaveLength(1);
		expect(urls[0]).toContain('api.open-meteo.com/v1/forecast');
		expect(urls[0]).toContain('past_days=');
		expect(urls[0]).toContain('hourly=temperature_2m,relative_humidity_2m,weather_code');
	});

	it('still uses the forecast endpoint inside its 92-day past window', () => {
		const urls = weatherUrls(47.37, 8.54, new Date('2026-07-05T09:00:00Z'), now);
		expect(urls).toHaveLength(1);
		// 30.1 days back asks for 32: the day itself, rounded up, plus one to absorb a
		// run that straddles UTC midnight.
		expect(urls[0]).toContain('past_days=32');
	});

	it('prefers the high-resolution archive for an older backfill, ERA5 second', () => {
		const urls = weatherUrls(47.37, 8.54, new Date('2026-01-15T09:00:00Z'), now);
		// ERA5's 25 km grid reads over a degree off for a city in a valley, so the 2 km
		// models are asked first and the reanalysis is only the fallback.
		expect(urls).toHaveLength(2);
		expect(urls[0]).toContain('historical-forecast-api.open-meteo.com/v1/forecast');
		expect(urls[1]).toContain('archive-api.open-meteo.com/v1/archive');
		for (const url of urls) {
			expect(url).toContain('start_date=2026-01-15');
			expect(url).toContain('end_date=2026-01-15');
		}
	});
});

describe('pickHour', () => {
	const hourly = {
		time: ['2026-08-04T16:00', '2026-08-04T17:00', '2026-08-04T18:00'],
		temperature_2m: [18.44, 19.2, 17.8],
		relative_humidity_2m: [66.4, 71, 74],
		weather_code: [3, 61, 61]
	};

	it('takes the nearest hour and rounds for display', () => {
		const hit = pickHour(hourly, new Date('2026-08-04T17:20:00Z'));
		expect(hit).toEqual({
			temperatureC: 19.2,
			humidity: 71,
			code: 61,
			time: new Date('2026-08-04T17:00:00Z')
		});
	});

	it('rounds temperature to a tenth and humidity to a whole percent', () => {
		const hit = pickHour(hourly, new Date('2026-08-04T16:05:00Z'));
		expect(hit?.temperatureC).toBe(18.4);
		expect(hit?.humidity).toBe(66);
	});

	it('refuses a sample too far from the run', () => {
		// Two hours out is a gap in the series, not a reading about this run.
		expect(pickHour(hourly, new Date('2026-08-04T21:00:00Z'))).toBeNull();
	});

	it('refuses a row missing any of the three fields', () => {
		const partial = { ...hourly, relative_humidity_2m: [null, null, null] };
		expect(pickHour(partial, new Date('2026-08-04T17:00:00Z'))).toBeNull();
	});

	it('has nothing to pick from an empty response', () => {
		expect(pickHour(undefined, new Date())).toBeNull();
		expect(pickHour({ time: [] }, new Date())).toBeNull();
	});
});

/**
 * Weather lookup for a finished GPS session, via Open-Meteo.
 *
 * Chosen over the alternatives because it needs no API key: a session can arrive from
 * the offline outbox hours after it was recorded, and that write path should not depend
 * on a billing-gated credential. Free for non-commercial use, CC-BY 4.0 — the attribution
 * is rendered next to the reading in the UI.
 *
 * Two endpoints, one query shape. The reanalysis archive is authoritative but lags a few
 * days, while the forecast endpoint will serve up to 92 days of recent past from the
 * high-resolution models — so a run saved minutes ago is answered by the latter and a
 * months-old backfill by the former.
 *
 * Every failure here is non-fatal by construction: the caller stores nothing and the
 * session is saved regardless. Weather is a nice thing to have on a run, never a reason
 * to lose one.
 */

import { conditionFromWmoCode, trackAverage, type SessionWeather, type TrackPointLike } from '$lib/fitness/weather';

const SOURCE = 'open-meteo';
const HOURLY = 'temperature_2m,relative_humidity_2m,weather_code';
/** The forecast endpoint's own limit on how far back it will look. */
const MAX_PAST_DAYS = 92;
/** Leave the last few days to the forecast endpoint — the archive has not caught up. */
const ARCHIVE_FROM_DAYS = 88;
/** A run's weather is an hourly sample; further off than this and it is a data gap. */
const MAX_SAMPLE_DISTANCE_MS = 90 * 60_000;
const TIMEOUT_MS = 2500;

/** Which endpoint answers for a given age, and the query that asks it. */
export function weatherUrl(lat: number, lng: number, when: Date, now = new Date()): string {
	const ageDays = (now.getTime() - when.getTime()) / 86_400_000;
	const coords = `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`;

	if (ageDays > ARCHIVE_FROM_DAYS) {
		const day = when.toISOString().slice(0, 10);
		return `https://archive-api.open-meteo.com/v1/archive?${coords}&start_date=${day}&end_date=${day}&hourly=${HOURLY}&timezone=UTC`;
	}
	// past_days must cover the run's own day; +1 absorbs a run near a UTC midnight.
	const pastDays = Math.min(MAX_PAST_DAYS, Math.max(1, Math.ceil(ageDays) + 1));
	return `https://api.open-meteo.com/v1/forecast?${coords}&hourly=${HOURLY}&past_days=${pastDays}&forecast_days=1&timezone=UTC`;
}

type HourlyBlock = {
	time?: string[];
	temperature_2m?: (number | null)[];
	relative_humidity_2m?: (number | null)[];
	weather_code?: (number | null)[];
};

/**
 * The hourly sample nearest `when`, or null when the response has no usable one.
 *
 * With `timezone=UTC` the provider returns naive local-to-UTC stamps ("2026-08-04T09:00"),
 * so the Z is appended rather than assumed.
 */
export function pickHour(
	hourly: HourlyBlock | undefined,
	when: Date
): { temperatureC: number; humidity: number; code: number; time: Date } | null {
	const times = hourly?.time ?? [];
	if (times.length === 0) return null;

	const target = when.getTime();
	let bestIdx = -1;
	let bestDelta = Infinity;
	for (let i = 0; i < times.length; i++) {
		const t = new Date(`${times[i]}Z`).getTime();
		if (!Number.isFinite(t)) continue;
		const delta = Math.abs(t - target);
		if (delta < bestDelta) {
			bestDelta = delta;
			bestIdx = i;
		}
	}
	if (bestIdx < 0 || bestDelta > MAX_SAMPLE_DISTANCE_MS) return null;

	const temperatureC = hourly?.temperature_2m?.[bestIdx];
	const humidity = hourly?.relative_humidity_2m?.[bestIdx];
	const code = hourly?.weather_code?.[bestIdx];
	// A row exists but the fields we came for are absent: treat as no reading rather
	// than storing a partial one that the UI would have to keep guarding.
	if (temperatureC == null || humidity == null || code == null) return null;

	return {
		temperatureC: Math.round(temperatureC * 10) / 10,
		humidity: Math.round(humidity),
		code,
		time: new Date(`${times[bestIdx]}Z`)
	};
}

/** The weather at a point and time, or null if it could not be established. */
export async function fetchWeatherAt(lat: number, lng: number, when: Date): Promise<SessionWeather | null> {
	const res = await fetch(weatherUrl(lat, lng, when), {
		signal: AbortSignal.timeout(TIMEOUT_MS),
		headers: { accept: 'application/json' }
	});
	if (!res.ok) return null;
	const body = await res.json();
	const hour = pickHour(body?.hourly, when);
	if (!hour) return null;

	return {
		temperatureC: hour.temperatureC,
		humidity: hour.humidity,
		code: hour.code,
		condition: conditionFromWmoCode(hour.code),
		lat: Math.round(lat * 10000) / 10000,
		lng: Math.round(lng * 10000) / 10000,
		time: hour.time,
		source: SOURCE
	};
}

/**
 * The weather a session was performed in, from its own track.
 *
 * Returns null — quietly — for anything without GPS: an indoor session has no location
 * to ask about, and that is not a failure.
 */
export async function weatherForTrack(track: TrackPointLike[] | null | undefined): Promise<SessionWeather | null> {
	const at = trackAverage(track);
	if (!at) return null;
	try {
		return await fetchWeatherAt(at.lat, at.lng, at.time);
	} catch {
		// Offline, timed out, rate-limited, malformed — all the same to the caller.
		return null;
	}
}

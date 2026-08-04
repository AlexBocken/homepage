/**
 * Weather recorded with a GPS-tracked session.
 *
 * Two pure pieces: where and when to ask about (the run's average location at its
 * mid-time), and how to reduce a provider's numeric code to the handful of conditions
 * worth showing. Kept free of server imports so both the lookup and the UI read from
 * one definition, and so the interesting logic is testable without a network.
 */

/** The conditions a run is described by. Deliberately coarse — this is a log entry. */
export type WeatherCondition =
	| 'clear'
	| 'partly_cloudy'
	| 'cloudy'
	| 'fog'
	| 'drizzle'
	| 'rain'
	| 'showers'
	| 'snow'
	| 'thunderstorm';

/** What gets stored on the session. */
export type SessionWeather = {
	temperatureC: number;
	/** Relative humidity, %. */
	humidity: number;
	/** The provider's raw WMO code, kept so a remapping never needs a refetch. */
	code: number;
	condition: WeatherCondition;
	/** The point this describes — the run's average location. */
	lat: number;
	lng: number;
	/** The hour this describes. */
	time: Date;
	source: string;
};

/**
 * WMO 4677 present-weather code → condition.
 *
 * These are the codes Open-Meteo returns in `weather_code`. Freezing variants fold into
 * their wet parent (56/57 → drizzle, 66/67 → rain) and snow showers into snow: the
 * distinction matters to a forecaster, not to someone reading back how a run felt.
 */
export function conditionFromWmoCode(code: number): WeatherCondition {
	if (code === 0) return 'clear';
	if (code === 1 || code === 2) return 'partly_cloudy';
	if (code === 3) return 'cloudy';
	if (code === 45 || code === 48) return 'fog';
	if (code >= 51 && code <= 57) return 'drizzle';
	if (code >= 61 && code <= 67) return 'rain';
	if (code >= 71 && code <= 77) return 'snow';
	if (code === 85 || code === 86) return 'snow';
	if (code >= 80 && code <= 82) return 'showers';
	if (code >= 95 && code <= 99) return 'thunderstorm';
	// Unknown code: overcast is the least wrong guess, and `code` is stored anyway.
	return 'cloudy';
}

export type TrackPointLike = { lat: number; lng: number; timestamp: number };

/**
 * Where and when to ask about: the mean of the track's coordinates, at the midpoint of
 * its time span.
 *
 * The mean rather than the start because a run is not a point — and the mid-time rather
 * than the start time because a ninety-minute run that set off at dusk was mostly run
 * in the dark. Over the few kilometres a run covers the two candidate points (mean
 * position vs. the position at half-time) sit in the same weather; the mean is used
 * because it needs no assumption about even pacing.
 */
export function trackAverage(track: TrackPointLike[] | null | undefined): {
	lat: number;
	lng: number;
	time: Date;
} | null {
	const pts = (track ?? []).filter(
		(p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.timestamp)
	);
	if (pts.length === 0) return null;

	let sumLat = 0;
	let sumLng = 0;
	let first = pts[0].timestamp;
	let last = pts[0].timestamp;
	for (const p of pts) {
		sumLat += p.lat;
		sumLng += p.lng;
		if (p.timestamp < first) first = p.timestamp;
		if (p.timestamp > last) last = p.timestamp;
	}

	return {
		lat: sumLat / pts.length,
		lng: sumLng / pts.length,
		time: new Date(first + (last - first) / 2)
	};
}

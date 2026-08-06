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
	| 'mainly_clear'
	| 'partly_cloudy'
	| 'cloudy'
	| 'fog'
	| 'drizzle'
	| 'rain'
	| 'showers'
	| 'snow'
	| 'thunderstorm'
	/** The provider sent a code we have no mapping for. Shown as such, never guessed. */
	| 'unknown';

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
	// WMO separates these and so do forecasts in both languages — "mainly clear"/heiter
	// is a different sky from "partly cloudy"/teils bewölkt.
	if (code === 1) return 'mainly_clear';
	if (code === 2) return 'partly_cloudy';
	if (code === 3) return 'cloudy';
	if (code === 45 || code === 48) return 'fog';
	if (code >= 51 && code <= 57) return 'drizzle';
	if (code >= 61 && code <= 67) return 'rain';
	if (code >= 71 && code <= 77) return 'snow';
	if (code === 85 || code === 86) return 'snow';
	if (code >= 80 && code <= 82) return 'showers';
	if (code >= 95 && code <= 99) return 'thunderstorm';
	// Anything else is reported as unknown rather than folded into overcast: a wrong
	// claim about the sky is worse than an admitted gap, and the raw code travels with
	// it so the gap can be closed later.
	return 'unknown';
}

/**
 * How the air felt to work in, on the dew-point scale.
 *
 * Relative humidity on its own says very little about that: 60% at 12 °C is pleasant and
 * 60% at 27 °C is punishing, because warm air holds far more water at the same
 * percentage. Dew point is the absolute measure, and it is the one that tracks whether
 * sweat can still evaporate — which is exactly what makes a run feel harder.
 */
export type HumidityFeel = 'dry' | 'comfortable' | 'humid' | 'muggy' | 'oppressive';

/**
 * Dew point in °C, from temperature and relative humidity (Magnus–Tetens with the
 * Sonntag coefficients, valid roughly −45…60 °C).
 *
 * Derived rather than stored: the provider offers it, but deriving means every reading
 * already recorded gains a dew point without refetching a single one.
 */
export function dewPointC(temperatureC: number, humidityPercent: number): number | null {
	if (!Number.isFinite(temperatureC) || !Number.isFinite(humidityPercent)) return null;
	// 0% would take log(0); clamp rather than return nothing, since a stored 0 is far
	// more likely to be a rounded 0.4% than genuinely dry-to-the-limit air.
	const rh = Math.min(100, Math.max(1, humidityPercent));
	const gamma = Math.log(rh / 100) + (17.62 * temperatureC) / (243.12 + temperatureC);
	const dp = (243.12 * gamma) / (17.62 - gamma);
	return Math.round(dp * 10) / 10;
}

/**
 * The dew-point bands in common use, which are published in whole °F and converted here:
 * 40 °F → 4.4, 60 °F → 15.6, 65 °F → 18.3, 70 °F → 21.1.
 *
 * They happen to be the boundaries endurance guidance uses too — pace begins to suffer
 * above a 60 °F dew point, noticeably past 65 °F and badly past 70 °F — which is why this
 * scale is worth showing on a run rather than the raw percentage alone.
 */
export function humidityFeel(temperatureC: number, humidityPercent: number): HumidityFeel | null {
	const dp = dewPointC(temperatureC, humidityPercent);
	if (dp == null) return null;
	if (dp < 4.4) return 'dry';
	if (dp < 15.6) return 'comfortable';
	if (dp < 18.3) return 'humid';
	if (dp < 21.1) return 'muggy';
	return 'oppressive';
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

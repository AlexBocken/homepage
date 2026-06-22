/**
 * Shared GPS-track number-crunching for the workout detail route and the public
 * share view. Both used to carry their own copies of these helpers; centralising
 * them also lets the pace/elevation/cadence charts share ONE distance grid so
 * their x-axes line up exactly and a hover lands on the same distance in every
 * graph (and on the map pin).
 */

import { computeElevationStats } from '$lib/hikes/elevation';

/** Pace as `M:SS min/km` for graph tooltips. @param {number} minPerKm */
export function formatPaceTooltip(minPerKm) {
	const mm = Math.floor(minPerKm);
	const s = Math.round((minPerKm - mm) * 60);
	return `${mm}:${s.toString().padStart(2, '0')} min/km`;
}

/** Haversine distance in km. @param {any} a @param {any} b */
export function haversine(a, b) {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h = sinLat * sinLat +
		Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** Total length of a track in km. @param {any[]} track */
export function trackDistance(track) {
	let total = 0;
	for (let i = 1; i < track.length; i++) total += haversine(track[i - 1], track[i]);
	return total;
}

/**
 * Km splits — array of `{ km, pace (min/km), elapsed (min) }`, plus a final
 * partial km when > 50 m. @param {any[]} track
 */
export function computeSplits(track) {
	if (track.length < 2) return [];
	/** @type {Array<{km: number, pace: number, elapsed: number}>} */
	const splits = [];
	let cumDist = 0;
	let splitStartTime = track[0].timestamp;
	for (let i = 1; i < track.length; i++) {
		cumDist += haversine(track[i - 1], track[i]);
		const currentKm = Math.floor(cumDist);
		const prevKm = splits.length;
		if (currentKm > prevKm) {
			const elapsedMin = (track[i].timestamp - splitStartTime) / 60000;
			const segDist = cumDist - prevKm;
			const pace = segDist > 0 ? elapsedMin / segDist : 0;
			splits.push({ km: currentKm, pace, elapsed: (track[i].timestamp - track[0].timestamp) / 60000 });
			splitStartTime = track[i].timestamp;
		}
	}
	const lastKm = splits.length;
	const partialDist = cumDist - lastKm;
	if (partialDist > 0.05) {
		const elapsedMin = (track[track.length - 1].timestamp - splitStartTime) / 60000;
		splits.push({
			km: cumDist,
			pace: elapsedMin / partialDist,
			elapsed: (track[track.length - 1].timestamp - track[0].timestamp) / 60000
		});
	}
	return splits;
}

/**
 * Pick a clean x-axis tick step (km) for a route of `maxKm`, aiming for
 * ~4–8 ticks: 250 m / 500 m / 1 / 2.5 / 5 / 10 / 20 / 50 km.
 * @param {number} maxKm
 */
export function niceDistanceStep(maxKm) {
	const steps = [0.25, 0.5, 1, 2.5, 5, 10, 20, 50];
	for (const s of steps) {
		if (maxKm / s <= 8) return s;
	}
	return 100;
}

/**
 * Build everything the detail views render for one GPS exercise: the three
 * charts (pace / elevation / cadence) on a shared distance grid + linear axis,
 * elevation gain/loss, km splits, and summary distance/pace.
 *
 * Each chart's `points[k]` records the originating track-point index of chart
 * point `k`. Because all three charts share the same grid (`idxs`), a hover
 * resolves to the same distance in every chart and on the map pin.
 *
 * @param {any[]} track
 * @param {{ dark: boolean, elevationLabel: string, cadenceLabel: string }} opts
 */
export function buildGpsView(track, { dark, elevationLabel, cadenceLabel }) {
	const n = track.length;

	// Cumulative distance per track point.
	const cumDist = new Array(n).fill(0);
	for (let i = 1; i < n; i++) cumDist[i] = cumDist[i - 1] + haversine(track[i - 1], track[i]);
	const totalDist = n > 0 ? cumDist[n - 1] : 0;

	// Rolling pace (min/km) per point over a 200 m trailing window; null where
	// undefined (too little distance) or implausible (> 30 min/km).
	/** @type {Array<number|null>} */
	const paceAt = new Array(n).fill(null);
	const windowDist = 0.2;
	for (let i = 1; i < n; i++) {
		let backDist = 0;
		let j = i;
		while (j > 0 && backDist < windowDist) { backDist += haversine(track[j - 1], track[j]); j--; }
		if (backDist < 0.05) continue;
		const dt = (track[i].timestamp - track[j].timestamp) / 60000;
		const pace = dt / backDist;
		if (pace > 0 && pace < 30) paceAt[i] = pace;
	}

	/** @type {Array<number|null>} */
	const altAt = track.map((p) => (p.altitude == null ? null : p.altitude));
	/** @type {Array<number|null>} */
	const cadAt = track.map((p) => (p.cadence == null ? null : Math.round(p.cadence)));

	// One shared downsample grid for all three charts (~160 points), so their
	// x positions and hover indices line up exactly.
	const step = Math.max(1, Math.floor(n / 160));
	/** @type {number[]} */
	const idxs = [];
	for (let i = 0; i < n; i += step) idxs.push(i);
	if (n > 0 && idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1);

	const xAxis = { min: 0, max: totalDist, stepSize: niceDistanceStep(totalDist), unit: ' km' };
	const points = idxs.map((i) => ({ idx: i }));

	/**
	 * @param {Array<number|null>} series @param {string} label
	 * @param {string} color @param {string} fill @param {boolean} round
	 */
	const mk = (series, label, color, fill, round) => {
		const data = idxs.map((i) => ({
			x: +cumDist[i].toFixed(3),
			y: series[i] == null ? null : round ? Math.round(/** @type {number} */ (series[i])) : series[i]
		}));
		const has = idxs.some((i) => series[i] != null);
		return {
			has,
			points,
			data: { datasets: [{ label, data, borderColor: color, backgroundColor: fill, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }] }
		};
	};

	const pace = mk(paceAt, 'Pace', dark ? '#88C0D0' : '#5E81AC', dark ? 'rgba(136, 192, 208, 0.12)' : 'rgba(94, 129, 172, 0.12)', false);
	const elevation = mk(altAt, elevationLabel, dark ? '#A3BE8C' : '#8FBCBB', dark ? 'rgba(163, 190, 140, 0.18)' : 'rgba(143, 188, 187, 0.18)', true);
	const cadence = mk(cadAt, cadenceLabel, dark ? '#B48EAD' : '#5E81AC', dark ? 'rgba(180, 142, 173, 0.12)' : 'rgba(94, 129, 172, 0.12)', true);

	// Elevation gain/loss from the full-resolution altitude series.
	/** @type {Array<{dist: number, altitude: number}>} */
	const elevSamples = [];
	for (let i = 0; i < n; i++) if (altAt[i] != null) elevSamples.push({ dist: cumDist[i], altitude: /** @type {number} */ (altAt[i]) });
	const elevStats = elevSamples.length > 1 ? computeElevationStats(elevSamples) : null;

	const cadVals = cadAt.filter((/** @type {number|null} */ c) => c != null);
	const avgCadence = cadVals.length ? Math.round(cadVals.reduce((/** @type {number} */ a, /** @type {any} */ c) => a + c, 0) / cadVals.length) : 0;

	const elapsed = n > 1 ? (track[n - 1].timestamp - track[0].timestamp) / 60000 : 0;
	const avgPace = totalDist > 0 && elapsed > 0 ? elapsed / totalDist : 0;

	return {
		hasCharts: n >= 2,
		xAxis,
		dist: totalDist,
		avgPace,
		elevStats,
		avgCadence,
		splits: computeSplits(track),
		pace,
		elevation,
		cadence
	};
}

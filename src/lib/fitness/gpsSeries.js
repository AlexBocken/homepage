/**
 * Shared GPS-track number-crunching for the workout detail route and the public
 * share view. Both used to carry their own copies of these helpers; centralising
 * them also lets the pace/elevation/cadence charts share ONE distance grid so
 * their x-axes line up exactly and a hover lands on the same distance in every
 * graph (and on the map pin).
 */

import { computeElevationStats } from '$lib/hikes/elevation';
import { haversineKm as haversine, trackDistance } from '$lib/gpx';

// One haversine for the whole app lives in `$lib/gpx`; re-exported under the
// names segment matching / the segment grid / SegmentCreator already import.
export { haversine, trackDistance };

/** Pace as `M:SS min/km` for graph tooltips. @param {number} minPerKm */
export function formatPaceTooltip(minPerKm) {
	return `${formatPaceAxis(minPerKm)} min/km`;
}

/** Pace as `M:SS` for y-axis ticks — a pace is read as minutes and seconds, so
 *  "6.25" is a small puzzle where "6:15" is not. @param {number} minPerKm */
export function formatPaceAxis(minPerKm) {
	const total = Math.round(minPerKm * 60);
	const mm = Math.floor(total / 60);
	const ss = total % 60;
	return `${mm}:${ss.toString().padStart(2, '0')}`;
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
 * Half-widths (km) of the distance-window smoothing applied to each chart
 * series before rendering. Small on purpose — enough to take the jitter off
 * (Swisstopo's 0.5 m elevation quantisation, GPS pace jitter, the stair-stepped
 * cadence carried over from snapping), not so much that hills or pace changes
 * get flattened. Nudge toward 0 to show rawer data.
 */
const SMOOTH_HALF_WINDOW_KM = { elevation: 0.03, pace: 0.03, cadence: 0.04 };

/**
 * Y-axis shape per chart: the tick steps that read cleanly in that unit, and the
 * span the axis never zooms in past.
 *
 * The minimum span is the point of this: a treadmill-steady run varies by a
 * couple of seconds per km, and an axis fitted to *that* fills the chart with
 * what is really GPS noise, drawn as if it were dramatic. Below the minimum the
 * window is held open and centred, so a flat series is drawn flat.
 *
 * Pace steps are 5 s / 10 s / 15 s / 30 s / 1 min / …, expressed in minutes, so
 * every gridline lands on a whole number of seconds when labelled `M:SS`.
 */
export const GPS_Y_AXIS = {
	pace: { steps: [1 / 12, 1 / 6, 0.25, 0.5, 1, 2, 5], minSpan: 1, floor: 0 },
	elevation: { steps: [5, 10, 20, 25, 50, 100, 200, 500], minSpan: 50, floor: null },
	cadence: { steps: [2, 5, 10, 20, 25, 50], minSpan: 20, floor: 0 }
};

/** Most gridline gaps a GPS chart may draw (they are only 160–180 px tall). */
const MAX_Y_INTERVALS = 5;

/** Smallest 1 / 2 / 5 × 10ⁿ step that is at least `target` — the fallback for a
 *  range that outgrows a unit's listed steps (an alpine profile against the
 *  500 m ceiling). Those decade steps are whole minutes / metres too, so a pace
 *  gridline still lands on a round number of seconds. @param {number} target */
function coarseStep(target) {
	const mag = Math.pow(10, Math.floor(Math.log10(target)));
	for (const m of [1, 2, 5]) if (m * mag >= target - 1e-9) return m * mag;
	return 10 * mag;
}

/**
 * Fit a y-axis to `values`: never tighter than `minSpan`, always on gridlines
 * from `steps`, and never opened below `floor` (a pace or a cadence cannot go
 * negative — clamping there shifts the window up rather than shrinking it).
 *
 * @param {Array<number|null>} values
 * @param {{ steps: number[], minSpan: number, floor: number|null }} cfg
 * @returns {{ min: number, max: number, stepSize: number } | undefined}
 */
export function fitYAxis(values, { steps, minSpan, floor }) {
	let lo = Infinity;
	let hi = -Infinity;
	for (const v of values) {
		if (v == null || !Number.isFinite(v)) continue;
		if (v < lo) lo = v;
		if (v > hi) hi = v;
	}
	if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;

	let span = hi - lo;
	if (span < minSpan) {
		const mid = (lo + hi) / 2;
		lo = mid - minSpan / 2;
		hi = mid + minSpan / 2;
		span = minSpan;
	}

	const step = steps.find((s) => span / s <= MAX_Y_INTERVALS + 1e-9) ?? coarseStep(span / MAX_Y_INTERVALS);
	let min = Math.floor(lo / step + 1e-9) * step;
	let max = Math.ceil(hi / step - 1e-9) * step;
	if (max - min < step) max = min + step;
	if (floor != null && min < floor) {
		const intervals = Math.round((max - min) / step);
		min = floor;
		max = floor + step * intervals;
	}
	return { min, max, stepSize: step };
}

/**
 * Distance-windowed moving average. Averages each point with its neighbours
 * within ±`halfWindowKm` along the track. A distance window (rather than a
 * fixed point count) keeps the amount of smoothing consistent regardless of how
 * densely the track was sampled, and averaging before the render-grid subsample
 * also anti-aliases that subsample.
 *
 * Nulls are skipped in the average and preserved at the centre, so gaps in the
 * series (e.g. implausible pace) stay gaps rather than being bridged. `cumDist`
 * is monotonic, so a pair of forward-only cursors keeps this O(n).
 *
 * @param {Array<number|null>} series
 * @param {number[]} cumDist cumulative distance (km), same length as `series`
 * @param {number} halfWindowKm
 * @returns {Array<number|null>}
 */
function smoothByDistance(series, cumDist, halfWindowKm) {
	const n = series.length;
	/** @type {Array<number|null>} */
	const out = new Array(n).fill(null);
	let lo = 0;
	let hi = 0;
	let sum = 0;
	let count = 0;
	for (let i = 0; i < n; i++) {
		const center = cumDist[i];
		while (hi < n && cumDist[hi] <= center + halfWindowKm) {
			if (series[hi] != null) { sum += /** @type {number} */ (series[hi]); count++; }
			hi++;
		}
		while (lo < i && cumDist[lo] < center - halfWindowKm) {
			if (series[lo] != null) { sum -= /** @type {number} */ (series[lo]); count--; }
			lo++;
		}
		out[i] = series[i] == null ? null : count > 0 ? sum / count : series[i];
	}
	return out;
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
	 * @param {{ steps: number[], minSpan: number, floor: number|null }} axisCfg
	 */
	const mk = (series, label, color, fill, round, axisCfg) => {
		const data = idxs.map((i) => ({
			x: +cumDist[i].toFixed(3),
			y: series[i] == null ? null : round ? Math.round(/** @type {number} */ (series[i])) : series[i]
		}));
		const has = idxs.some((i) => series[i] != null);
		return {
			has,
			points,
			// Fitted to the drawn (subsampled, rounded) values, not the raw series,
			// so nothing on screen can fall outside the axis.
			yAxis: fitYAxis(data.map((p) => p.y), axisCfg),
			data: { datasets: [{ label, data, borderColor: color, backgroundColor: fill, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }] }
		};
	};

	// Light distance-window smoothing for the drawn lines only. The gain/loss and
	// average below stay on the raw series so the reported numbers don't drift.
	const paceSmooth = smoothByDistance(paceAt, cumDist, SMOOTH_HALF_WINDOW_KM.pace);
	const altSmooth = smoothByDistance(altAt, cumDist, SMOOTH_HALF_WINDOW_KM.elevation);
	const cadSmooth = smoothByDistance(cadAt, cumDist, SMOOTH_HALF_WINDOW_KM.cadence);

	const pace = mk(paceSmooth, 'Pace', dark ? '#88C0D0' : '#5E81AC', dark ? 'rgba(136, 192, 208, 0.12)' : 'rgba(94, 129, 172, 0.12)', false, GPS_Y_AXIS.pace);
	const elevation = mk(altSmooth, elevationLabel, dark ? '#A3BE8C' : '#8FBCBB', dark ? 'rgba(163, 190, 140, 0.18)' : 'rgba(143, 188, 187, 0.18)', true, GPS_Y_AXIS.elevation);
	const cadence = mk(cadSmooth, cadenceLabel, dark ? '#B48EAD' : '#5E81AC', dark ? 'rgba(180, 142, 173, 0.12)' : 'rgba(94, 129, 172, 0.12)', true, GPS_Y_AXIS.cadence);

	// Elevation gain/loss from the full-resolution (unsmoothed) altitude series.
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

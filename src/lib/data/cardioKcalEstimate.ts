/**
 * Kilocalorie estimation for cardio activities.
 *
 * ─── Running & Walking (with GPS elevation) ──────────────────────────────
 *
 *   Minetti, A.E. et al. (2002) "Energy cost of walking and running at
 *   extreme uphill and downhill slopes."
 *   J. Appl. Physiol., 93, pp.1039–1046.
 *   DOI: 10.1152/japplphysiol.01177.2001
 *
 *   5th-order polynomial regressions for cost of transport (J·kg⁻¹·m⁻¹)
 *   as a function of gradient i (decimal, e.g. 0.10 = 10%):
 *
 *     Cw (walking) = 280.5i⁵ − 58.7i⁴ − 76.8i³ + 51.9i² + 19.6i + 2.5
 *     Cr (running) = 155.4i⁵ − 30.4i⁴ − 43.3i³ + 46.3i² + 19.5i + 3.6
 *
 *   Both R² = 0.999, valid for gradients from −0.45 to +0.45.
 *   Units: J per kg body mass per metre of horizontal distance.
 *
 *   On flat ground: Cw ≈ 2.5 J/kg/m, Cr ≈ 3.6 J/kg/m
 *   → Walking ≈ 0.60 kcal/kg/km, Running ≈ 0.86 kcal/kg/km
 *
 * ─── Running & Walking (flat, no GPS) ────────────────────────────────────
 *
 *   Léger, L. & Mercier, D. (1984) — net cost of running ≈ 1 kcal/kg/km
 *   (remarkably speed-independent for running). Walking ≈ 0.7 kcal/kg/km.
 *
 * ─── Cycling ─────────────────────────────────────────────────────────────
 *
 *   With GPS: physics model — power = aero drag + rolling resistance + gravity
 *     P = (0.5·CdA·ρ·v² + Cr·m·g + m·g·sin(θ)) · v
 *     kcal = P · time / (efficiency · 4184)
 *
 *   Without GPS: MET-based from average speed.
 *     Ainsworth, B.E. et al. (2011) "Compendium of Physical Activities."
 *     Med. Sci. Sports Exerc., 43(8), pp.1575–1581.
 *     DOI: 10.1249/MSS.0b013e31821ece12
 *
 *     kcal/hr = MET × bodyweight_kg × 1.05
 *
 * ─── Other cardio (swimming, rowing, elliptical, etc.) ───────────────────
 *
 *   MET-based fallback from the Compendium.
 */

// ── Minetti polynomials ──────────────────────────────────────────────────

/** Cost of walking in J/kg/m as function of gradient (decimal) */
function minettiWalking(i: number): number {
	// Clamp to studied range
	i = Math.max(-0.45, Math.min(0.45, i));
	return 280.5*i**5 - 58.7*i**4 - 76.8*i**3 + 51.9*i**2 + 19.6*i + 2.5;
}

/** Cost of running in J/kg/m as function of gradient (decimal) */
function minettiRunning(i: number): number {
	i = Math.max(-0.45, Math.min(0.45, i));
	return 155.4*i**5 - 30.4*i**4 - 43.3*i**3 + 46.3*i**2 + 19.5*i + 3.6;
}

// ── GPS helpers ──────────────────────────────────────────────────────────

interface GpsPoint {
	lat: number;
	lng: number;
	altitude?: number;
	timestamp: number;
}

/** Haversine distance in metres */
function haversineM(a: GpsPoint, b: GpsPoint): number {
	const R = 6371000;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h = sinLat * sinLat +
		Math.cos((a.lat * Math.PI) / 180) *
		Math.cos((b.lat * Math.PI) / 180) *
		sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

// ── GPS-based estimation (running/walking/hiking) ────────────────────────

type Gait = 'running' | 'walking';

/**
 * Estimate kcal from a GPS track using Minetti's gradient-dependent
 * cost-of-transport polynomials. Splits the track into segments, computes
 * gradient per segment, looks up CoT, sums energy across all segments.
 *
 * @param track - GPS track with lat, lng, altitude, timestamp
 * @param bodyWeightKg - user body weight
 * @param gait - 'running' or 'walking' (hiking uses walking)
 * @returns { kcal, distanceKm }
 */
export function estimateGpsRunWalkKcal(
	track: GpsPoint[],
	bodyWeightKg: number,
	gait: Gait = 'running'
): { kcal: number; distanceKm: number } {
	if (track.length < 2) return { kcal: 0, distanceKm: 0 };

	const costFn = gait === 'running' ? minettiRunning : minettiWalking;
	const hasElevation = track.some(p => p.altitude != null);

	let totalEnergy = 0; // Joules
	let totalDistance = 0; // metres

	for (let idx = 1; idx < track.length; idx++) {
		const a = track[idx - 1];
		const b = track[idx];

		const horizDist = haversineM(a, b);
		if (horizDist < 0.5) continue; // skip near-duplicate points

		totalDistance += horizDist;

		let gradient = 0;
		if (hasElevation && a.altitude != null && b.altitude != null) {
			const elevChange = b.altitude - a.altitude;
			gradient = elevChange / horizDist;
		}

		const costPerKgPerM = costFn(gradient);
		totalEnergy += costPerKgPerM * bodyWeightKg * horizDist;
	}

	const kcal = totalEnergy / 4184; // J → kcal
	return { kcal: Math.round(kcal), distanceKm: totalDistance / 1000 };
}

// ── GPS-based cycling estimation ─────────────────────────────────────────

// Default cycling parameters
const CDA = 0.35;       // drag area (m²) — road cyclist, hoods position
const RHO = 1.225;      // air density (kg/m³) at sea level
const CR_ROLLING = 0.005; // rolling resistance coefficient (road tyres)
const G = 9.81;         // gravity (m/s²)
const EFFICIENCY = 0.22; // gross mechanical efficiency of cycling

/**
 * Estimate cycling kcal from GPS track using a physics model.
 * Power = aerodynamic drag + rolling resistance + gravity component.
 * Energy = power × time, converted via mechanical efficiency.
 *
 * For downhill segments where net power would be negative (coasting),
 * we use a minimum metabolic cost (freewheeling ≈ 3.5 METs).
 */
export function estimateGpsCyclingKcal(
	track: GpsPoint[],
	bodyWeightKg: number,
	bikeWeightKg = 10
): { kcal: number; distanceKm: number } {
	if (track.length < 2) return { kcal: 0, distanceKm: 0 };

	const totalMass = bodyWeightKg + bikeWeightKg;
	// Minimum metabolic rate while cycling (coasting) ≈ 3.5 METs
	const minKcalPerSec = (3.5 * bodyWeightKg * 3.5 / 1000) * (5.0 / 60);
	// 3.5 METs = 3.5 × 3.5 mL O₂/kg/min, and 1 L O₂ ≈ 5.0 kcal

	let totalKcal = 0;
	let totalDistance = 0;

	for (let idx = 1; idx < track.length; idx++) {
		const a = track[idx - 1];
		const b = track[idx];

		const horizDist = haversineM(a, b);
		if (horizDist < 0.5) continue;

		const dt = (b.timestamp - a.timestamp) / 1000; // seconds
		if (dt <= 0) continue;

		totalDistance += horizDist;

		const speed = horizDist / dt; // m/s

		// Gradient
		let sinTheta = 0;
		if (a.altitude != null && b.altitude != null) {
			const elevChange = b.altitude - a.altitude;
			const slopeDist = Math.sqrt(horizDist * horizDist + elevChange * elevChange);
			sinTheta = elevChange / slopeDist;
		}

		// Power components (watts)
		const pAero = 0.5 * CDA * RHO * speed * speed * speed;
		const pRoll = CR_ROLLING * totalMass * G * speed;
		const pGrav = totalMass * G * sinTheta * speed;
		const pTotal = pAero + pRoll + pGrav;

		// Energy for this segment (kcal)
		let segmentKcal: number;
		if (pTotal > 0) {
			// Metabolic energy = mechanical energy / efficiency
			segmentKcal = (pTotal * dt) / (EFFICIENCY * 4184);
		} else {
			// Coasting downhill — use minimum metabolic cost
			segmentKcal = minKcalPerSec * dt;
		}

		totalKcal += segmentKcal;
	}

	return { kcal: Math.round(totalKcal), distanceKm: totalDistance / 1000 };
}

// ── MET-based fallback estimates (no GPS) ────────────────────────────────

/**
 * MET values from Ainsworth et al. (2011) Compendium of Physical Activities.
 * kcal/hr = MET × bodyweight_kg × 1.05 (correction for RMR definition)
 *
 * For running/cycling with distance+duration, we derive average speed
 * and look up the corresponding MET value.
 */

/** Running METs by speed (km/h). Interpolated from Compendium codes 12xxx. */
const RUNNING_METS: [number, number][] = [
	[6.4,   6.0],  // jogging, very slow
	[8.0,   8.3],  // 12:00 min/mile
	[9.7,   9.8],  // 10:00 min/mile
	[10.8, 10.5],  // 9:00 min/mile
	[11.3, 11.0],  // 8:30 min/mile
	[12.1, 11.8],  // 8:00 min/mile
	[12.9, 12.8],  // 7:30 min/mile
	[13.8, 13.5],  // 7:00 min/mile
	[14.5, 14.5],  // 6:30 min/mile
	[16.1, 15.0],  // 6:00 min/mile
	[17.7, 16.0],  // 5:30 min/mile
	[19.3, 23.0],  // 5:00 min/mile — very fast
];

/** Cycling METs by speed (km/h). From Compendium codes 01xxx. */
const CYCLING_METS: [number, number][] = [
	[8.9,   3.5],  // leisure, very slow
	[16.0,  6.8],  // leisure, 10-11.9 mph
	[19.3,  8.0],  // moderate, 12-13.9 mph
	[22.5, 10.0],  // vigorous, 14-15.9 mph
	[25.7, 12.0],  // racing, 16-19 mph
	[30.6, 15.8],  // racing, > 20 mph
];

/** Interpolate MET from speed using a lookup table */
function interpolateMet(table: [number, number][], speedKmh: number): number {
	if (speedKmh <= table[0][0]) return table[0][1];
	if (speedKmh >= table[table.length - 1][0]) return table[table.length - 1][1];

	for (let i = 1; i < table.length; i++) {
		if (speedKmh <= table[i][0]) {
			const [s0, m0] = table[i - 1];
			const [s1, m1] = table[i];
			const t = (speedKmh - s0) / (s1 - s0);
			return m0 + t * (m1 - m0);
		}
	}
	return table[table.length - 1][1];
}

/** Fixed MET values for activities without speed data */
const FIXED_METS: Record<string, number> = {
	'swimming':       5.8,  // Compendium 18310, moderate effort
	'rowing-machine': 7.0,  // Compendium 15552, moderate
	'rowing-outdoor': 5.8,  // Compendium 18070, moderate
	'elliptical':     5.0,  // Compendium 02048
	'stair-climber':  9.0,  // Compendium 17133
	'jump-rope':     11.8,  // Compendium 15551, moderate
	'cycling-indoor': 6.8,  // Compendium 02014, moderate
};

// ── Main cardio estimation interface ─────────────────────────────────────

export interface CardioEstimateResult {
	kcal: number;
	lower: number;
	upper: number;
	method: 'minetti-gps' | 'cycling-physics' | 'met-speed' | 'met-fixed' | 'flat-rate';
}

/**
 * Estimate cardio kcal for a single exercise.
 *
 * Priority:
 *   1. GPS track available → Minetti (run/walk/hike) or physics model (cycling)
 *   2. Distance + duration available → MET from average speed
 *   3. Duration only → fixed MET for exercise type
 *   4. Distance only → flat-rate kcal/kg/km
 *
 * Uncertainty: ±15% for GPS-based, ±25% for MET-based, ±30% for flat-rate
 */
export function estimateCardioKcal(
	exerciseId: string,
	bodyWeightKg: number,
	options: {
		gpsTrack?: GpsPoint[];
		distanceKm?: number;
		durationMin?: number;
	}
): CardioEstimateResult {
	const { gpsTrack, distanceKm, durationMin } = options;

	// Determine activity category
	const isRunning = exerciseId === 'running';
	const isWalking = exerciseId === 'walking' || exerciseId === 'hiking';
	const isCycling = exerciseId === 'cycling-outdoor' || exerciseId === 'cycling-indoor';
	const isRunOrWalk = isRunning || isWalking;

	// 1. GPS-based estimation
	if (gpsTrack && gpsTrack.length >= 2) {
		if (isRunOrWalk) {
			const gait: Gait = isRunning ? 'running' : 'walking';
			const result = estimateGpsRunWalkKcal(gpsTrack, bodyWeightKg, gait);
			return withUncertainty(result.kcal, 0.15, 'minetti-gps');
		}
		if (isCycling) {
			const result = estimateGpsCyclingKcal(gpsTrack, bodyWeightKg);
			return withUncertainty(result.kcal, 0.15, 'cycling-physics');
		}
	}

	// 2. Distance + duration → average speed → MET lookup
	if (distanceKm && distanceKm > 0 && durationMin && durationMin > 0) {
		const speedKmh = distanceKm / (durationMin / 60);

		if (isRunning) {
			const met = interpolateMet(RUNNING_METS, speedKmh);
			const kcal = met * bodyWeightKg * (durationMin / 60) * 1.05;
			return withUncertainty(kcal, 0.20, 'met-speed');
		}
		if (isWalking) {
			// Walking: ~3.5 METs at 5 km/h, scales roughly with speed
			const met = Math.max(2.0, 0.7 * speedKmh);
			const kcal = met * bodyWeightKg * (durationMin / 60) * 1.05;
			return withUncertainty(kcal, 0.20, 'met-speed');
		}
		if (isCycling) {
			const met = interpolateMet(CYCLING_METS, speedKmh);
			const kcal = met * bodyWeightKg * (durationMin / 60) * 1.05;
			return withUncertainty(kcal, 0.20, 'met-speed');
		}
	}

	// 3. Duration only → fixed MET
	if (durationMin && durationMin > 0) {
		const met = FIXED_METS[exerciseId];
		if (met) {
			const kcal = met * bodyWeightKg * (durationMin / 60) * 1.05;
			return withUncertainty(kcal, 0.25, 'met-fixed');
		}

		// Running/walking/cycling without distance — use moderate METs
		if (isRunning) {
			const kcal = 9.8 * bodyWeightKg * (durationMin / 60) * 1.05;
			return withUncertainty(kcal, 0.30, 'met-fixed');
		}
		if (isWalking) {
			const kcal = 3.5 * bodyWeightKg * (durationMin / 60) * 1.05;
			return withUncertainty(kcal, 0.30, 'met-fixed');
		}
		if (isCycling) {
			const kcal = 6.8 * bodyWeightKg * (durationMin / 60) * 1.05;
			return withUncertainty(kcal, 0.30, 'met-fixed');
		}
	}

	// 4. Distance only → flat-rate kcal/kg/km
	if (distanceKm && distanceKm > 0) {
		let kcalPerKgPerKm: number;
		if (isRunning) kcalPerKgPerKm = 1.0;       // Léger & Mercier
		else if (isWalking) kcalPerKgPerKm = 0.7;   // walking on flat
		else if (isCycling) kcalPerKgPerKm = 0.3;   // rough cycling estimate
		else kcalPerKgPerKm = 0.8;                   // generic cardio

		const kcal = kcalPerKgPerKm * bodyWeightKg * distanceKm;
		return withUncertainty(kcal, 0.30, 'flat-rate');
	}

	return { kcal: 0, lower: 0, upper: 0, method: 'flat-rate' };
}

function withUncertainty(
	kcal: number,
	pct: number,
	method: CardioEstimateResult['method']
): CardioEstimateResult {
	const rounded = Math.round(kcal);
	const margin = Math.round(kcal * pct);
	return {
		kcal: rounded,
		lower: Math.max(0, rounded - margin),
		upper: rounded + margin,
		method,
	};
}

/**
 * Estimate cumulative cardio kcal across multiple exercises/workouts.
 * Simple sum with combined uncertainty (root-sum-of-squares of margins).
 */
export function estimateCumulativeCardioKcal(
	results: CardioEstimateResult[]
): { kcal: number; lower: number; upper: number } {
	let totalKcal = 0;
	let sumMarginSq = 0;

	for (const r of results) {
		totalKcal += r.kcal;
		const margin = r.kcal - r.lower;
		sumMarginSq += margin * margin;
	}

	const combinedMargin = Math.round(Math.sqrt(sumMarginSq));
	return {
		kcal: Math.round(totalKcal),
		lower: Math.max(0, Math.round(totalKcal) - combinedMargin),
		upper: Math.round(totalKcal) + combinedMargin,
	};
}

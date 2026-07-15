/**
 * Generates `src/routes/tourplan/travel.generated.json` — the frozen travel
 * times between consecutive Aktive stops of the Trommler tour.
 *
 *   pnpm tourplan:travel          # fills in whatever is missing
 *   pnpm tourplan:travel --force  # re-geocode + re-route everything
 *
 * Hits the Google Maps API once, at generation time; the site itself never
 * calls Google. The key comes from `pass dev/GoogleMapsAPIKey` (override with
 * GOOGLE_MAPS_API_KEY).
 *
 * Needs two APIs enabled on the Cloud project: Geocoding API and Routes API.
 * (The legacy Distance Matrix API is not enabled for new projects.)
 *
 * Mode per leg: we ask for the walking route first and keep it when the
 * on-foot distance is under 300 m; anything further is done by car.
 */
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { TOUR, stopKey, stopLocation, attendsAktive, type Stop } from '../src/routes/tourplan/data';

const OUT = path.resolve('src/routes/tourplan/travel.generated.json');

/** Walk anything closer than this (measured along the walking route). */
const WALK_THRESHOLD_M = 300;

/** Muster/placeholder rows that name no real place — they get no leg. */
const SKIP_NAMES = new Set(['EP', 'Noch offen']);

/**
 * Hand-verified positions that beat whatever the geocoder returns.
 *
 * Keyed by the exact query we would otherwise send (`stopLocation(stop)`), so a
 * single entry fixes every stop at that place — "Festplatz" is 8 rows across the
 * week, "Stadtgarten" 3. Stops whose "address" is a place name rather than a
 * street are the ones the geocoder misses; check each on a map and pin it here.
 *
 * Moving a pin drops the legs into and out of the affected stops so they reroute.
 */
const PLACE_OVERRIDES: Record<string, LatLng> = {
	// "Rathaus" resolved to the wrong building.
	'Rathaus, Weingarten (Württemberg), Deutschland': {
		lat: 47.80778660564809,
		lng: 9.641496187037214
	}

	// The remaining place-name queries, with how many stops each covers. They may
	// well geocode fine — spot-check the coords the run prints, and pin any that
	// land wrong. "Festumzug Weingarten" is a parade rather than an address, so
	// it almost certainly needs one.
	//
	// 'Festplatz, Weingarten (Württemberg), Deutschland':            { lat: 0, lng: 0 },  // 10 stops
	// 'Stadtgarten, Weingarten (Württemberg), Deutschland':          { lat: 0, lng: 0 },  //  3
	// 'Gymnasium Weingarten, Weingarten (Württemberg), Deutschland': { lat: 0, lng: 0 },  //  2
	// 'Basilika-Vorplatz, Weingarten (Württemberg), Deutschland':    { lat: 0, lng: 0 },
	// 'Karlstraße/Löwenplatz, Weingarten (Württemberg), Deutschland':{ lat: 0, lng: 0 },
	// 'Finanzamt, Weingarten (Württemberg), Deutschland':            { lat: 0, lng: 0 },
	// 'Sechserbrunnen, Weingarten (Württemberg), Deutschland':       { lat: 0, lng: 0 },
	// 'Lindenhofstadion, Weingarten (Württemberg), Deutschland':     { lat: 0, lng: 0 },
	// 'Festumzug Weingarten, Weingarten (Württemberg), Deutschland': { lat: 0, lng: 0 },
	// 'Schwanenweiher, Weingarten (Württemberg), Deutschland':       { lat: 0, lng: 0 },
	// 'Talschule, Weingarten (Württemberg), Deutschland':            { lat: 0, lng: 0 },
};

/** Be a good citizen against the quota. */
const PAUSE_MS = 120;

type LatLng = { lat: number; lng: number };
type Leg = { to: string; mode: 'walking' | 'driving'; meters: number; seconds: number };
type Out = { generatedAt: string | null; coords: Record<string, LatLng>; legs: Record<string, Leg> };

const force = process.argv.includes('--force');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function apiKey(): string {
	const fromEnv = process.env.GOOGLE_MAPS_API_KEY?.trim();
	if (fromEnv) return fromEnv;
	// $(pass dev/GoogleMapsAPIKey)
	return execFileSync('pass', ['dev/GoogleMapsAPIKey'], { encoding: 'utf8' }).split('\n')[0].trim();
}

/**
 * A stop on the Aktive march that we can route to: the corps actually goes
 * there, it has a clock time, and it names a real place. Ehemalige-only events
 * are stepped over — the corps never marches to them.
 */
function isRoutable(stop: Stop): boolean {
	return (
		attendsAktive(stop) &&
		Boolean(stop.time) &&
		!SKIP_NAMES.has(stop.name) &&
		stopLocation(stop) !== null
	);
}

async function geocode(address: string, key: string): Promise<LatLng> {
	const u = new URL('https://maps.googleapis.com/maps/api/geocode/json');
	u.searchParams.set('address', address);
	u.searchParams.set('region', 'de');
	u.searchParams.set('key', key);
	const res = await fetch(u);
	const json = await res.json();
	if (json.status !== 'OK' || !json.results?.length) {
		throw new Error(`geocode failed for "${address}": ${json.status} ${json.error_message ?? ''}`);
	}
	const { lat, lng } = json.results[0].geometry.location;
	return { lat, lng };
}

const waypoint = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });

/**
 * Routes API (`directions/v2:computeRoutes`). The legacy Distance Matrix API is
 * no longer enabled for new Cloud projects, so we use the current one — enable
 * "Routes API" on the project if this 403s.
 */
async function route(
	from: LatLng,
	to: LatLng,
	mode: 'walking' | 'driving',
	key: string
): Promise<{ meters: number; seconds: number }> {
	const body: Record<string, unknown> = {
		origin: waypoint(from),
		destination: waypoint(to),
		travelMode: mode === 'walking' ? 'WALK' : 'DRIVE',
		units: 'METRIC'
	};
	// routingPreference is only valid for motorised modes.
	if (mode === 'driving') body.routingPreference = 'TRAFFIC_UNAWARE';

	const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': key,
			'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
		},
		body: JSON.stringify(body)
	});
	const json = await res.json();
	if (!res.ok) {
		throw new Error(`Routes API ${mode} failed (${res.status}): ${json?.error?.message ?? JSON.stringify(json)}`);
	}
	const r = json.routes?.[0];
	if (!r) throw new Error(`Routes API ${mode}: no route between the two points`);
	// duration comes back as a protobuf duration string, e.g. "421s".
	const seconds = Number(String(r.duration).replace(/s$/, ''));
	if (!Number.isFinite(seconds)) throw new Error(`Routes API ${mode}: bad duration ${r.duration}`);
	return { meters: Number(r.distanceMeters ?? 0), seconds };
}

async function main() {
	const key = apiKey();
	if (!key) throw new Error('no Google Maps API key');

	let prev: Out = { generatedAt: null, coords: {}, legs: {} };
	try {
		prev = JSON.parse(await fs.readFile(OUT, 'utf8'));
	} catch {
		/* first run */
	}

	const coords: Record<string, LatLng> = force ? {} : { ...prev.coords };
	const legs: Record<string, Leg> = force ? {} : { ...prev.legs };

	const sorted = <T>(o: Record<string, T>): Record<string, T> =>
		Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

	// Checkpoint to disk. Called after geocoding and again as legs land, so a
	// failure mid-run never throws away the API calls we already paid for.
	const save = async () => {
		const out: Out = {
			generatedAt: new Date().toISOString(),
			coords: sorted(coords),
			legs: sorted(legs)
		};
		await fs.writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
	};

	// Drop every leg touching a stop whose position just moved, so step 2 reroutes it.
	const invalidate = (movedKey: string) => {
		for (const [from, leg] of Object.entries(legs)) {
			if (from === movedKey || leg.to === movedKey) delete legs[from];
		}
	};

	// Prune entries for stops that no longer exist. Renaming a stop changes its
	// stopKey, so without this the cache keeps the old coordinate forever and the
	// leg into it still points at a name nobody renders.
	const liveKeys = new Set(
		TOUR.flatMap((day) =>
			day.stops
				.filter(isRoutable)
				.map((stop) => stopKey({ date: day.date, time: stop.time, name: stop.name }))
		)
	);
	for (const k of Object.keys(coords)) {
		if (!liveKeys.has(k)) {
			delete coords[k];
			console.log(`pruned coord  ${k}`);
		}
	}
	for (const [from, leg] of Object.entries(legs)) {
		if (!liveKeys.has(from) || !liveKeys.has(leg.to)) {
			delete legs[from];
			console.log(`pruned leg    ${from}`);
		}
	}

	// 1. Resolve a position for every routable stop: a hand-verified pin if we
	//    have one, otherwise the geocoder (cached across runs).
	const usedOverrides = new Set<string>();
	for (const day of TOUR) {
		for (const stop of day.stops) {
			if (!isRoutable(stop)) continue;
			const key_ = stopKey({ date: day.date, time: stop.time, name: stop.name });
			const where = stopLocation(stop)!;

			const pin = PLACE_OVERRIDES[where];
			if (pin) {
				usedOverrides.add(where);
				const before = coords[key_];
				if (!before || before.lat !== pin.lat || before.lng !== pin.lng) {
					coords[key_] = pin;
					invalidate(key_);
					console.log(`pinned    ${key_}  →  ${pin.lat},${pin.lng}`);
				}
				continue;
			}

			if (coords[key_]) continue;
			coords[key_] = await geocode(where, key);
			console.log(`geocoded  ${key_}  →  ${coords[key_].lat},${coords[key_].lng}`);
			await sleep(PAUSE_MS);
		}
	}

	// Typo guard: an override that never matched is a silently-dead entry.
	for (const where of Object.keys(PLACE_OVERRIDES)) {
		if (!usedOverrides.has(where)) throw new Error(`PLACE_OVERRIDES key matches no stop: ${where}`);
	}

	await save(); // don't lose the geocodes if routing blows up below

	// 2. One leg between each pair of consecutive routable stops within a day.
	//    Skipped rows (EP, "Noch offen") are stepped over, not routed around.
	let walked = 0;
	let drove = 0;
	try {
		for (const day of TOUR) {
			const chain = day.stops
				.filter(isRoutable)
				.map((stop) => ({ stop, key: stopKey({ date: day.date, time: stop.time, name: stop.name }) }));

			for (let i = 0; i < chain.length - 1; i++) {
				const from = chain[i];
				const to = chain[i + 1];
				if (legs[from.key]?.to === to.key) continue;

				const onFoot = await route(coords[from.key], coords[to.key], 'walking', key);
				await sleep(PAUSE_MS);

				let leg: Leg;
				if (onFoot.meters < WALK_THRESHOLD_M) {
					leg = { to: to.key, mode: 'walking', ...onFoot };
					walked++;
				} else {
					const byCar = await route(coords[from.key], coords[to.key], 'driving', key);
					await sleep(PAUSE_MS);
					leg = { to: to.key, mode: 'driving', ...byCar };
					drove++;
				}
				legs[from.key] = leg;
				console.log(
					`leg  ${from.stop.name} → ${to.stop.name}  ${leg.mode}  ${leg.meters} m  ${Math.round(leg.seconds / 60)} min`
				);
			}
		}
	} finally {
		// Persist whatever landed, success or failure — re-running resumes here.
		await save();
	}

	console.log(`\nwrote ${OUT}`);
	console.log(`${Object.keys(legs).length} legs total (${walked} walked, ${drove} driven this run)`);
}

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});

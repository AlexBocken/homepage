import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimit, enrichElevations } from '$lib/server/hikesRouting';

const MAX_COORDS = 4000;

// Single-point lookup: `GET ?lat=…&lng=…` returns `{ elevation: number | null }`.
// Used by EditMap when a waypoint is dropped via map click — keeps round-trips
// cheap for the common one-at-a-time case.
export const GET: RequestHandler = async ({ url, locals, getClientAddress }) => {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user) throw error(401, 'Anmeldung erforderlich');

	const rateKey = session.user.nickname ?? session.user.email ?? getClientAddress();
	const { ok, retryAfter } = rateLimit(`elev:${rateKey}`);
	if (!ok) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(retryAfter ?? 60)
			}
		});
	}

	const lat = parseFloat(url.searchParams.get('lat') ?? '');
	const lng = parseFloat(url.searchParams.get('lng') ?? '');
	if (!isFinite(lat) || !isFinite(lng)) throw error(400, 'Invalid lat/lng');

	const elevations = await enrichElevations([[lng, lat]]);
	return json({ elevation: elevations[0] ?? null });
};

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user) throw error(401, 'Anmeldung erforderlich');

	const rateKey = session.user.nickname ?? session.user.email ?? getClientAddress();
	const { ok, retryAfter } = rateLimit(`elev:${rateKey}`);
	if (!ok) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(retryAfter ?? 60)
			}
		});
	}

	let body: { coordinates?: Array<[number, number]> };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const coords = body.coordinates;
	if (!Array.isArray(coords) || coords.length === 0) {
		throw error(400, 'coordinates muss ein nicht-leeres Array sein');
	}
	if (coords.length > MAX_COORDS) {
		throw error(400, `Maximal ${MAX_COORDS} Koordinaten pro Anfrage`);
	}
	const cleaned = coords.filter(
		(c): c is [number, number] =>
			Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number'
	);
	if (cleaned.length !== coords.length) {
		throw error(400, 'Ungültige Koordinate(n) im Array');
	}

	const elevations = await enrichElevations(cleaned);
	return json({ elevations });
};

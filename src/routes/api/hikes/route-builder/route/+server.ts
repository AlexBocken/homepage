import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	rateLimit,
	routeWaypoints,
	type LatLng,
	type RoutingProfile
} from '$lib/server/hikesRouting';

const MAX_WAYPOINTS = 200;

const VALID_PROFILES: RoutingProfile[] = ['hiking-mountain', 'trekking', 'road'];

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user) throw error(401, 'Anmeldung erforderlich');

	const rateKey = session.user.nickname ?? session.user.email ?? getClientAddress();
	const { ok, retryAfter } = rateLimit(`route:${rateKey}`);
	if (!ok) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(retryAfter ?? 60)
			}
		});
	}

	let body: { waypoints?: LatLng[]; profile?: RoutingProfile; forceLinear?: boolean };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	if (!Array.isArray(body.waypoints) || body.waypoints.length < 2) {
		throw error(400, 'Mindestens zwei Wegpunkte nötig');
	}
	if (body.waypoints.length > MAX_WAYPOINTS) {
		throw error(400, `Maximal ${MAX_WAYPOINTS} Wegpunkte pro Anfrage`);
	}
	const waypoints = body.waypoints.filter(
		(w): w is LatLng =>
			typeof w?.lat === 'number' &&
			typeof w?.lng === 'number' &&
			isFinite(w.lat) &&
			isFinite(w.lng)
	);
	if (waypoints.length !== body.waypoints.length) {
		throw error(400, 'Ungültige Koordinaten im Wegpunkt-Array');
	}

	const profile: RoutingProfile = VALID_PROFILES.includes(body.profile as RoutingProfile)
		? (body.profile as RoutingProfile)
		: 'hiking-mountain';

	const { segments, source } = await routeWaypoints({
		waypoints,
		profile,
		forceLinear: body.forceLinear === true
	});

	return json({ segments, source });
};

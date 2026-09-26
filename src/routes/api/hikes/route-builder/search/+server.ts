import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rateLimit } from '$lib/server/hikesRouting';
import type { GeoResult } from '$lib/data/geocode';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * Location search for the route builder. Proxies Photon (Komoot's OSM-based
 * geocoder, built for as-you-type search) so the browser never talks to it
 * directly — keeps a single User-Agent, centralises rate limiting, and lets us
 * swap in a self-hosted Photon later by changing one constant.
 *
 * Photon usage policy asks for a descriptive User-Agent and reasonable load;
 * results carry "© OpenStreetMap contributors" (already credited site-wide).
 */
const PHOTON_URL = 'https://photon.komoot.io/api';
const PHOTON_TIMEOUT_MS = 8000;

interface PhotonFeature {
	geometry?: { coordinates?: [number, number] };
	properties?: Record<string, unknown> & {
		name?: string;
		city?: string;
		county?: string;
		state?: string;
		country?: string;
		extent?: [number, number, number, number];
	};
}

/** Build "Name, City, State, Country" dropping blanks and duplicates. */
function labelFor(p: NonNullable<PhotonFeature['properties']>): string {
	const parts = [p.name, p.city ?? p.county, p.state, p.country]
		.map((v) => (typeof v === 'string' ? v.trim() : ''))
		.filter(Boolean);
	return [...new Set(parts)].join(', ');
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);

	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 2) return json({ results: [] satisfies GeoResult[] });

	const rateKey = user.nickname;
	const { ok, retryAfter } = rateLimit(`geocode:${rateKey}`);
	if (!ok) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter ?? 60) }
		});
	}

	const params = new URLSearchParams({ q, limit: '6' });
	params.set('lang', url.searchParams.get('lang') === 'en' ? 'en' : 'de');
	// Bias ranking toward the current map view when the client supplies a centre.
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	if (Number.isFinite(lat) && Number.isFinite(lon)) {
		params.set('lat', String(lat));
		params.set('lon', String(lon));
	}

	let data: { features?: PhotonFeature[] };
	try {
		const res = await fetch(`${PHOTON_URL}?${params}`, {
			headers: { 'User-Agent': 'bocken.org hikes route-builder (geocode proxy)' },
			signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS)
		});
		if (!res.ok) throw new Error(`photon ${res.status}`);
		data = await res.json();
	} catch {
		throw error(502, 'Ortssuche momentan nicht verfügbar');
	}

	const results: GeoResult[] = (data.features ?? [])
		.map((f): GeoResult | null => {
			const coords = f.geometry?.coordinates;
			const p = f.properties;
			if (!coords || !p) return null;
			const [lon, lat] = coords;
			if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
			const label = labelFor(p);
			if (!label) return null;
			return { label, lat, lon, extent: p.extent ?? null };
		})
		.filter((r): r is GeoResult => r !== null);

	return json({ results });
};

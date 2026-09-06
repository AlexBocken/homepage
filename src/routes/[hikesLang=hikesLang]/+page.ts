import { redirect } from '@sveltejs/kit';
import { HIKES } from '$lib/data/hikes.generated';
import { HIKE_TRAVEL_URL } from '$lib/data/hikeTravel.generated';
import { canonicalParams } from '$lib/hikes/browseParams';
import type { HikeTravelTable } from '$types/hikes';

// Not prerendered, for the same reason as the detail page: the header in
// `hikes/+layout.svelte` renders the signed-in user, and that comes from
// `hikes/+layout.server.ts`. Prerendering this page runs that ancestor load at
// build time, where there is no request — so `session: null` was baked into
// `__data.json` with no dependencies to invalidate it, and every visitor got a
// logged-out header no matter who they were.
//
// The load itself is a filter over a static import, so serving it per request
// costs a render and nothing else.
export const prerender = false;

export const load = async ({ url, fetch }) => {
	// Public-transport travel times, fetched rather than bundled: the table grows
	// as hubs × hikes and has no business in the JS every visitor downloads. It
	// is hashed in its URL, so it caches hard and busts on rebuild. A failure is
	// not fatal — the listing simply shows no travel times.
	let travel: HikeTravelTable | null = null;
	try {
		const res = await fetch(HIKE_TRAVEL_URL);
		if (res.ok) travel = (await res.json()) as HikeTravelTable;
		else console.warn(`[hikes] travel table: HTTP ${res.status}`);
	} catch (err) {
		console.warn('[hikes] travel table:', err);
	}

	// The filter bar's script-free range form submits one field per input, so it
	// arrives as `?distminneg=-4&distmax=12`. Rewrite it to the spelling the app
	// itself writes before rendering anything, so nobody has to look at that URL
	// or share it.
	const canonical = canonicalParams(url.searchParams, HIKES, travel);
	if (canonical) {
		const target = canonical.toString();
		redirect(307, target ? `${url.pathname}?${target}` : url.pathname);
	}

	return { hikes: HIKES.filter((h) => !h.hidden), travel };
};

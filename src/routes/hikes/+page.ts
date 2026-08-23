import { redirect } from '@sveltejs/kit';
import { HIKES } from '$lib/data/hikes.generated';
import { canonicalParams } from '$lib/hikes/browseParams';

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

export const load = ({ url }) => {
	// The filter bar's script-free range form submits one field per input, so it
	// arrives as `?distminneg=-4&distmax=12`. Rewrite it to the spelling the app
	// itself writes before rendering anything, so nobody has to look at that URL
	// or share it.
	const canonical = canonicalParams(url.searchParams, HIKES);
	if (canonical) {
		const target = canonical.toString();
		redirect(307, target ? `${url.pathname}?${target}` : url.pathname);
	}

	return { hikes: HIKES.filter((h) => !h.hidden) };
};

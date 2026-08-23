import { HIKES } from '$lib/data/hikes.generated';

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

export const load = () => ({
	hikes: HIKES.filter((h) => !h.hidden)
});

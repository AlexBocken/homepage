import { error } from '@sveltejs/kit';
import { HIKES } from '$lib/data/hikes.generated';
import type { HikeTrackPoint } from '$types/hikes';
import type { PageLoad } from './$types';

// Not prerendered: the page needs the live session so private images can be
// gated behind login. Performance hit is small — the page is mostly hashed
// static assets (track JSON, image variants). Without this flag the prerender
// crawler still followed the overview's hike links and rendered every detail
// page at build time, which exhausted the prerender worker's heap
// (ERR_WORKER_OUT_OF_MEMORY); `false` keeps the crawler from prerendering them.
export const prerender = false;

// Glob the .svx modules so Vite can pre-bundle them and we can resolve
// the matching one synchronously at load time.
const mdxModules = import.meta.glob<{ default: unknown; metadata?: Record<string, unknown> }>(
	'/src/content/hikes/*/index.svx'
);

export const load: PageLoad = async ({ params, fetch }) => {
	const hike = HIKES.find((h) => h.slug === params.slug);
	if (!hike) throw error(404, 'Hike not found');

	const modPath = `/src/content/hikes/${params.slug}/index.svx`;
	const loader = mdxModules[modPath];
	if (!loader) throw error(404, 'Hike content missing');

	// Load the MDX module and the track JSON in parallel. The track was
	// previously fetched in a client-side $effect; doing it here means the
	// strip + map + elevation chart all render with real data on first
	// paint (no async pop-in / layout shift), and crucially the photo
	// strip exists in the DOM at view-transition snapshot time so the
	// /hikes → /hikes/[slug] slide-in animation actually has something
	// to capture.
	const [mod, trackResp] = await Promise.all([loader(), fetch(hike.trackUrl)]);
	if (!trackResp.ok) throw error(500, `Track konnte nicht geladen werden: ${trackResp.status}`);
	const track = (await trackResp.json()) as HikeTrackPoint[];

	return {
		hike,
		MdxComponent: mod.default,
		mdxMetadata: mod.metadata ?? {},
		track
	};
};

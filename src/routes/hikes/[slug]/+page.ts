import { error } from '@sveltejs/kit';
import { HIKES } from '$lib/data/hikes.generated';
import type { PageLoad } from './$types';

// Not prerendered: the page needs the live session so private images can be
// gated behind login. Performance hit is small — the page is mostly hashed
// static assets (track JSON, image variants).

// Glob the .svx modules so Vite can pre-bundle them and we can resolve
// the matching one synchronously at load time.
const mdxModules = import.meta.glob<{ default: unknown; metadata?: Record<string, unknown> }>(
	'/src/content/hikes/*/index.svx'
);

export const load: PageLoad = async ({ params }) => {
	const hike = HIKES.find((h) => h.slug === params.slug);
	if (!hike) throw error(404, 'Hike not found');

	const modPath = `/src/content/hikes/${params.slug}/index.svx`;
	const loader = mdxModules[modPath];
	if (!loader) throw error(404, 'Hike content missing');

	const mod = await loader();

	return {
		hike,
		MdxComponent: mod.default,
		mdxMetadata: mod.metadata ?? {}
	};
};

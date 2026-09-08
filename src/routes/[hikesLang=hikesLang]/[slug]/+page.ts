import { error } from '@sveltejs/kit';
import { HIKES } from '$lib/data/hikes.generated';
import { HIKE_TRAVEL_URL } from '$lib/data/hikeTravel.generated';
import type { HikeImages, HikeTrackPoint, HikeTravelTable } from '$types/hikes';
import type { PageLoad } from './$types';

// Not prerendered: the page needs the live session so private images can be
// gated behind login. Performance hit is small — the page is mostly hashed
// static assets (track JSON, image variants). Without this flag the prerender
// crawler still followed the overview's hike links and rendered every detail
// page at build time, which exhausted the prerender worker's heap
// (ERR_WORKER_OUT_OF_MEMORY); `false` keeps the crawler from prerendering them.
export const prerender = false;

// Glob the .svx modules so Vite can pre-bundle them and we can resolve
// the matching one synchronously at load time. Two globs, one per language:
// `*/index.svx` is a literal filename and cannot match `index.en.svx`, so the
// sets are disjoint. The English file is written by `pnpm hikes:translate`
// and may not exist yet; the English route then shows the German prose.
type Mdx = { default: unknown; metadata?: Record<string, unknown> };
const mdxModules = import.meta.glob<Mdx>('/src/content/hikes/*/index.svx');
const mdxModulesEn = import.meta.glob<Mdx>('/src/content/hikes/*/index.en.svx');

/** The glob records are typed as total, but a slug with no translation has no
 * entry; a function return keeps the `undefined` that a typed `const` would
 * narrow away. */
function loaderFor(modules: Record<string, () => Promise<Mdx>>, key: string): (() => Promise<Mdx>) | undefined {
	return modules[key];
}

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const { lang } = await parent();
	const hike = HIKES.find((h) => h.slug === params.slug);
	if (!hike) throw error(404, lang === 'en' ? 'Hike not found' : 'Wanderung nicht gefunden');

	const enLoader = loaderFor(mdxModulesEn, `/src/content/hikes/${params.slug}/index.en.svx`);
	const deLoader = loaderFor(mdxModules, `/src/content/hikes/${params.slug}/index.svx`);
	const loader = lang === 'en' && enLoader ? enLoader : deLoader;
	if (!loader) throw error(404, lang === 'en' ? 'Hike content missing' : 'Inhalt der Wanderung fehlt');
	/** Language of the prose actually rendered — differs from `lang` on an
	 * English page whose translation does not exist yet. */
	const proseLang: 'de' | 'en' = lang === 'en' && enLoader ? 'en' : 'de';

	// Load the MDX module, the track JSON and the photo payload in parallel.
	// All three are needed here, not in a client effect: the elevation chart's
	// SVG fallback, the trail-column map and the photo strip are server-
	// rendered from the track, and the strip and every inline <HikeImage>
	// from the photos. That is what keeps them on the page without JavaScript,
	// makes the pictures crawlable, and puts the strip in the DOM at
	// view-transition snapshot time. Kit inlines the track response into the
	// HTML (~12 KB gzipped) so hydration replays it without a second request;
	// fetching it after hydration instead saved that once but took the chart,
	// the trail map and the strip away from every no-JS reader.
	const [mod, trackResp, imagesResp, travelResp] = await Promise.all([
		loader(),
		fetch(hike.trackUrl),
		fetch(hike.imagesUrl),
		// Travel times ride along with the track and the photos for the same
		// reason they do: one fetch here beats a bundle every visitor pays for,
		// and having it before render means the JourneyPlanner's estimate is in
		// the first paint rather than appearing a beat later.
		fetch(HIKE_TRAVEL_URL).catch(() => null)
	]);
	if (!trackResp.ok)
		throw error(500, `${lang === 'en' ? 'Track could not be loaded' : 'Track konnte nicht geladen werden'}: ${trackResp.status}`);
	const track = (await trackResp.json()) as HikeTrackPoint[];
	if (!imagesResp.ok)
		throw error(500, `${lang === 'en' ? 'Image data could not be loaded' : 'Bilddaten konnten nicht geladen werden'}: ${imagesResp.status}`);
	const images = (await imagesResp.json()) as HikeImages;
	// Unlike the track, a missing travel table is not fatal: the page is about
	// the hike, and the estimate is a convenience on top of it.
	let travel: HikeTravelTable | null = null;
	if (travelResp?.ok) {
		try {
			travel = (await travelResp.json()) as HikeTravelTable;
		} catch (err) {
			console.warn('[hikes] travel table:', err);
		}
	}

	return {
		hike,
		travel,
		MdxComponent: mod.default,
		mdxMetadata: mod.metadata ?? {},
		track,
		images,
		proseLang,
		hasEnglish: !!enLoader
	};
};

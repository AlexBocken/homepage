import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.svx'],
			layout: {
				hike: 'src/lib/components/hikes/HikeMdxLayout.svelte'
			}
		})
	],
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			// Precompression is handled by scripts/precompress.ts in postbuild.
			// The adapter's own precompress is single-threaded and brotli-q11s every
			// file in build/client — including ~90 MB of already-compressed media and
			// 20 MB+ text blobs — adding minutes to the build for no gain. Our step is
			// parallel, skips binaries, and tunes brotli quality by size.
			precompress: false
		}),
		serviceWorker: {
			// Don't auto-register for every visitor. The SW (offline caching) is only
			// wanted in the installed PWA / Tauri app — a plain browser tab would
			// otherwise install it and start serving stale cached content. Registration
			// is gated to standalone/app contexts in src/routes/+layout.svelte.
			register: false
		},
		prerender: {
			// The only intentionally-static pages are /hikes (prerender=true) and
			// the /errors/[status] set (via that route's EntryGenerator). With the
			// crawler on, it follows the global nav out of /hikes and tries to
			// prerender the whole dynamic, DB-/ML-backed app — which runs the
			// forked prerender worker out of heap (ERR_WORKER_OUT_OF_MEMORY) and
			// fails the build. Disable crawling: the prerendered set is then driven
			// entirely by `prerender = true` + EntryGenerator.
			crawl: false,
			handleHttpError: ({ path, message }) => {
				// Defensive: hike image binaries live in `hikes-assets/`, outside
				// `/static` (nginx serves them in prod, a Vite middleware in dev —
				// see vite.config.ts), so the crawler can't fetch them. Harmless
				// while crawl is off, but keeps a 404 from failing the build if
				// crawling is ever re-enabled.
				if (/^\/hikes\/[^/]+\/images\//.test(path)) return;
				throw new Error(message);
			}
		},
		alias: {
			$models: 'src/models',
			$utils: 'src/utils',
			$types: 'src/types',
			// romcal ships the 1969 bundles inside its workspace dir but does not
			// re-export them, so exports-field resolution blocks a direct import. Point
			// the scoped package names at the bundle directories so both the TS types
			// (index.d.ts) and the ESM entry (esm/index.js) resolve via their package.json.
			'@romcal/calendar.general-roman': 'node_modules/romcal/rites/roman1969/dist/bundles/general-roman',
			'@romcal/calendar.switzerland': 'node_modules/romcal/rites/roman1969/dist/bundles/switzerland'
		}
	}
};

export default config;

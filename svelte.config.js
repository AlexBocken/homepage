import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: [vitePreprocess()],
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			precompress: true  // Enable brotli and gzip compression
		}),
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

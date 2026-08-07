import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [svelte()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		// Unit tests only. The Playwright e2e specs (tests/e2e/**) import from
		// @auth/sveltekit-incompatible @playwright/test and must NOT be picked up
		// by Vitest — they run via `pnpm test:e2e`.
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'tests/',
				'**/*.config.{js,ts}',
				'**/*.d.ts',
				'src/routes/**/+*.{js,ts,svelte}', // Exclude SvelteKit route files from coverage
				'src/app.html'
			]
		}
	},
	resolve: {
		// Svelte ships separate client and server builds. Without the browser
		// condition, importing a component under jsdom resolves to the server build
		// and @testing-library/svelte's render() dies on "mount() is not available on
		// the server".
		conditions: ['browser'],
		alias: {
			// SvelteKit's virtual env modules don't exist outside its build, so a
			// unit test that reaches a `+server.ts` cannot resolve them. The dynamic
			// stub carries an `env` object tests can write to; the static one carries
			// constants, matching how the real modules behave.
			'$env/dynamic/private': resolve('./tests/mocks/envDynamicPrivate.ts'),
			'$env/static/private': resolve('./tests/mocks/envStaticPrivate.ts'),
			$lib: resolve('./src/lib'),
			$utils: resolve('./src/utils'),
			$models: resolve('./src/models'),
			$types: resolve('./src/types')
		}
	}
});

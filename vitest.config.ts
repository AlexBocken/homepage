import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
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
		alias: {
			$lib: resolve('./src/lib'),
			$utils: resolve('./src/utils'),
			$models: resolve('./src/models'),
			$types: resolve('./src/types')
		}
	}
});

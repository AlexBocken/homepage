import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		allowedHosts: ["bocken.org"]
	},
	plugins: [sveltekit()],
	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: ['log', 'debug'],
				drop_debugger: true
			}
		},
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// Separate large dependencies into their own chunks
					if (id.includes('node_modules')) {
						if (id.includes('chart.js')) {
							return 'chart';
						}
						if (id.includes('@auth/sveltekit')) {
							return 'auth';
						}
					}
				}
			}
		}
	}
});

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	css: {
		lightningcss: {
			targets: {
				chrome: (80 << 16),
				firefox: (80 << 16),
				safari: (14 << 16),
			}
		}
	},
	server: {
		allowedHosts: ["bocken.org"]
	},
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['barcode-detector']
	},
	build: {
		rolldownOptions: {
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
						if (id.includes('barcode-detector') || id.includes('zxing-wasm')) {
							return 'barcode';
						}
					}
				}
			}
		}
	}
});

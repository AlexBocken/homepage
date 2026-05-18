import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';

/** In `vite dev`, hike image binaries live in `hikes-assets/` (outside `/static`
 *  so they aren't bundled into the Node build). In production nginx serves them
 *  directly from `/var/www/static/hikes/`; the SvelteKit dev server has no
 *  nginx in front, so we intercept `/hikes/<slug>/images/<file>` here and
 *  stream the file off disk. Private images (`/hikes/<slug>/private/<file>`)
 *  intentionally fall through to the SvelteKit endpoint, which enforces auth. */
function hikeImagesDevPlugin(): Plugin {
	const ROOT = path.resolve(process.cwd(), 'hikes-assets');
	const MIME: Record<string, string> = {
		'.avif': 'image/avif',
		'.webp': 'image/webp',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.svg': 'image/svg+xml'
	};
	return {
		name: 'hike-images-dev',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url ?? '';
				const m = url.match(/^\/hikes\/([^/]+)\/images\/([^/?#]+)(?:[?#].*)?$/);
				if (!m) return next();
				const [, slug, file] = m;
				if (slug.includes('..') || file.includes('..')) return next();
				const filePath = path.join(ROOT, slug, 'images', file);
				try {
					const stat = await fs.stat(filePath);
					const mime = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
					res.setHeader('Content-Type', mime);
					res.setHeader('Content-Length', String(stat.size));
					res.setHeader('Cache-Control', 'public, max-age=3600');
					createReadStream(filePath).pipe(res);
				} catch {
					next();
				}
			});
		}
	};
}

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
	plugins: [hikeImagesDevPlugin(), sveltekit()],
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
						if (id.includes('/leaflet/')) {
							return 'leaflet';
						}
					}
				}
			}
		}
	}
});

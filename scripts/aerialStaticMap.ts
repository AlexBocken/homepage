/**
 * Build-time renderer for the labelled aerial base map ("Luftbild").
 *
 * That layer is a MapLibre vector style (see `$lib/hikes/imageryLayer` and the
 * tile proxy's `/vt/…` route), so unlike the raster layers it can't be pieced
 * together from tiles with sharp: the labels only exist once MapLibre draws
 * them. So we let MapLibre draw them — in headless Chromium (Playwright's, the
 * one the e2e suite already installs), with the same style URL and the same
 * zoom convention the live map uses. The result is a plain PNG that
 * `staticHikeMap.ts` composites its route overlay onto, like any tile mosaic.
 *
 * One browser is shared across renders; call `closeAerialRenderer()` when done.
 */

import { promises as fs } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import type { Browser } from '@playwright/test';
import { TILE_URL } from '../src/lib/data/mapTiles.js';

const MAPLIBRE_DIST = path.resolve(process.cwd(), 'node_modules', 'maplibre-gl', 'dist');
const RENDER_TIMEOUT_MS = 90_000;

// MapLibre is an ES module with a module worker, so it needs a real http
// origin — `file://` and `setContent` can't load either.
const PAGE = `<!doctype html>
<html><head><style>html,body{margin:0}#m{position:absolute;inset:0;background:#ebebeb}</style></head>
<body><div id="m"></div>
<script type="module">
import * as ml from './maplibre-gl.mjs';
ml.setWorkerUrl(new URL('./maplibre-gl-worker.mjs', location.href).href);
window.renderMap = ({ style, center, zoom }) => new Promise((resolve) => {
	const errors = [];
	const map = new ml.Map({
		container: 'm', style, center, zoom,
		interactive: false, attributionControl: false, fadeDuration: 0
	});
	// A missing tile is an error event too; count them, don't give up.
	map.on('error', (e) => errors.push(String(e.error?.message ?? e.error ?? 'error')));
	map.once('idle', () => resolve({ ok: map.isStyleLoaded(), errors }));
});
</script></body></html>`;

let server: Promise<{ server: http.Server; origin: string }> | null = null;
let browser: Promise<Browser> | null = null;

function startServer(): Promise<{ server: http.Server; origin: string }> {
	return new Promise((resolve) => {
		const srv = http.createServer(async (req, res) => {
			const name = path.basename(new URL(req.url ?? '/', 'http://x').pathname);
			if (name === '' || name === 'index.html') {
				res.writeHead(200, { 'content-type': 'text/html' });
				return res.end(PAGE);
			}
			if (!/^maplibre-gl(-shared|-worker)?\.mjs$/.test(name)) {
				res.writeHead(404);
				return res.end();
			}
			res.writeHead(200, { 'content-type': 'text/javascript' });
			res.end(await fs.readFile(path.join(MAPLIBRE_DIST, name)));
		});
		srv.listen(0, '127.0.0.1', () => {
			const { port } = srv.address() as AddressInfo;
			resolve({ server: srv, origin: `http://127.0.0.1:${port}` });
		});
	});
}

async function launch(): Promise<Browser> {
	const { chromium } = await import('@playwright/test');
	// No GPU in a build: SwiftShader gives WebGL in software.
	return chromium.launch({
		args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
	});
}

/**
 * Render the aerial style at a Leaflet-style `zoom` centred on `center`
 * (`[lat, lng]`), as a `width × height` CSS-pixel PNG at `scale×` density.
 * Returns `null` when the browser, the style or the proxy isn't available.
 */
export async function renderAerialBase(opts: {
	center: [number, number];
	zoom: number;
	width: number;
	height: number;
	scale: number;
}): Promise<Buffer | null> {
	try {
		server ??= startServer();
		browser ??= launch();
		const { origin } = await server;
		const page = await (await browser).newPage({
			viewport: { width: opts.width, height: opts.height },
			deviceScaleFactor: opts.scale
		});
		try {
			await page.goto(`${origin}/index.html`);
			await page.waitForFunction(() => 'renderMap' in window);
			const result = await Promise.race([
				page.evaluate(
					(args) => (window as unknown as { renderMap: (a: typeof args) => Promise<{ ok: boolean; errors: string[] }> }).renderMap(args),
					{
						style: TILE_URL.luftbildStyle,
						center: [opts.center[1], opts.center[0]] as [number, number],
						// MapLibre counts zoom in 512 px tiles, Leaflet in 256 px ones —
						// the same one-level offset the live map's MapLibre layer uses.
						zoom: opts.zoom - 1
					}
				),
				new Promise<null>((r) => setTimeout(() => r(null), RENDER_TIMEOUT_MS))
			]);
			if (!result?.ok) {
				console.warn(`[aerialStaticMap] style did not load${result ? '' : ' (timed out)'}`);
				return null;
			}
			if (result.errors.length > 0 && process.env.STATIC_MAP_DEBUG) {
				console.warn(`[aerialStaticMap] ${result.errors.length} load error(s):`, result.errors.slice(0, 5));
			}
			return await page.screenshot({ type: 'png' });
		} finally {
			await page.close();
		}
	} catch (err) {
		console.warn('[aerialStaticMap] render failed:', err instanceof Error ? err.message : err);
		return null;
	}
}

export async function closeAerialRenderer(): Promise<void> {
	const b = browser;
	const s = server;
	browser = null;
	server = null;
	await Promise.all([
		b?.then((x) => x.close()).catch(() => {}),
		s?.then(({ server }) => new Promise((r) => server.close(r)))
	]);
}

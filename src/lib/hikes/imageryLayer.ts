import type * as Leaflet from 'leaflet';
// MapLibre builds its worker URL at runtime, which Vite can't see — so bundle
// the worker ourselves and hand MapLibre its URL.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { TILE_URL } from '$lib/data/mapTiles';

/**
 * The "Luftbild" base layer: aerial imagery with vector labels, paths and
 * borders (swisstopo's Imagery Basemap, plus OpenFreeMap abroad — merged by
 * the tile proxy), rendered by MapLibre inside Leaflet.
 *
 * Returned as an empty layer group that fetches MapLibre (~450 KB gzipped,
 * with its CSS) and fills itself the first time it is added to a map, so a
 * map that doesn't start on it only downloads MapLibre once a reader
 * switches to it.
 *
 * The canvas stays hidden until MapLibre has drawn a complete frame, then
 * fades in. MapLibre paints its grey style background as soon as the style
 * loads and only then fades the imagery in; shown straight away, that grey
 * would flash over whatever is beneath the map — on /hikes, the static hero
 * image. `onReady` fires once, when that first fade-in has finished — so
 * anything beneath can be removed without showing through a half-faded
 * canvas.
 */
export function imageryLayer(L: typeof Leaflet, onReady?: () => void): Leaflet.LayerGroup {
	const group = L.layerGroup();
	group.once('add', async () => {
		const [{ maplibreGL }, { setWorkerUrl }] = await Promise.all([
			import('@maplibre/maplibre-gl-leaflet'),
			import('maplibre-gl'),
			import('maplibre-gl/dist/maplibre-gl.css')
		]);
		setWorkerUrl(maplibreWorkerUrl);
		const layer = maplibreGL({ style: TILE_URL.luftbildStyle });
		const FADE_MS = 300;
		const REVEAL_FALLBACK_MS = 10_000;
		let ready = onReady;
		// The plugin builds a fresh MapLibre map every time the layer is added
		// (it's removed on every switch away), so this runs on each add.
		layer.on('add', () => {
			const container = layer.getContainer();
			const gl = layer.getMaplibreMap();
			// Hide instantly. The plugin has already measured the container, so
			// with the transition set now it would fade *out* from visible
			// while MapLibre paints its grey background — the very flash this
			// is meant to prevent. The transition is only for the reveal.
			container.style.transition = '';
			container.style.opacity = '0';
			// Tiles normally fade in from transparent, showing the grey style
			// background (and whatever is under the map) for a moment each —
			// on first load and on every pan.
			gl.once('style.load', () => {
				for (const l of gl.getStyle().layers) {
					if (l.type === 'raster') gl.setPaintProperty(l.id, 'raster-fade-duration', 0);
				}
			});
			// `idle` can fire before any tile is in (Firefox does, right at
			// `load`), so check for ourselves and wait for the next one if not.
			// Then give the finished frame two animation frames to reach the
			// screen before showing it. A tile that never settles mustn't keep
			// the map hidden, hence the fallback.
			const fallback = setTimeout(() => reveal(true), REVEAL_FALLBACK_MS);
			const reveal = (force = false) => {
				if (!force && (!gl.loaded() || !gl.areTilesLoaded())) return;
				clearTimeout(fallback);
				gl.off('idle', onIdle);
				requestAnimationFrame(() =>
					requestAnimationFrame(() => {
						container.style.transition = `opacity ${FADE_MS}ms ease`;
						container.style.opacity = '';
						if (ready) setTimeout(ready, FADE_MS);
						ready = undefined;
					})
				);
			};
			const onIdle = () => reveal();
			gl.on('idle', onIdle);
		});
		group.addLayer(layer);
	});
	return group;
}

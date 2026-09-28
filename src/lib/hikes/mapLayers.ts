import type * as Leaflet from 'leaflet';
import { TILE_URL, TILE_ATTRIBUTION, tileLayerOptions } from '$lib/data/mapTiles';
import { imageryLayer } from '$lib/hikes/imageryLayer';

/**
 * The base layers the hikes maps offer, and switching between them.
 *
 * The detail map, the listing's overview map and the route builder's edit map
 * all draw the same three layers with the same options; what differs between
 * them is only which one comes up first, how deep the schematic may zoom, and
 * whether a switch clamps the zoom and hands over from a static hero. Those
 * stay with the caller.
 */
export type BaseLayer = 'schematic' | 'aerial' | 'dufour';

/** Imagery reaches z19 everywhere the tile proxy serves it. */
const AERIAL_MAX_ZOOM = 19;
/** Dufour Map (1845–1864): swisstopo's historical layer, only goes up to
 * roughly z16. The map's maxZoom is capped while it is shown. */
const DUFOUR_MAX_ZOOM = 16;

/**
 * The deepest zoom a base layer has tiles for.
 *
 * @param schematicMaxZoom swisstopo reaches z19 over CH/LI, but the global
 *   fallback behind the proxy is shallower — each map decides how far to trust
 *   it for the hikes it shows.
 */
export function baseLayerMaxZoom(layer: BaseLayer, schematicMaxZoom: number): number {
	if (layer === 'schematic') return schematicMaxZoom;
	return layer === 'aerial' ? AERIAL_MAX_ZOOM : DUFOUR_MAX_ZOOM;
}

/**
 * One Leaflet layer per base layer. Nothing is fetched until a layer is added to
 * a map — the aerial one only downloads MapLibre then — so building all three for
 * a map that offers two costs nothing.
 *
 * @param onAerialReady fires once the aerial layer has drawn its first complete
 *   frame (see `imageryLayer`).
 */
export function makeBaseLayers(
	L: typeof Leaflet,
	{ schematicMaxZoom, onAerialReady }: { schematicMaxZoom: number; onAerialReady?: () => void }
): Record<BaseLayer, Leaflet.Layer> {
	const tiles = (url: string, maxZoom: number) =>
		L.tileLayer(url, {
			...tileLayerOptions(maxZoom),
			minZoom: 7,
			attribution: TILE_ATTRIBUTION,
			updateWhenZooming: false
		});
	return {
		schematic: tiles(TILE_URL.karte, schematicMaxZoom),
		aerial: imageryLayer(L, onAerialReady),
		dufour: tiles(TILE_URL.dufour, DUFOUR_MAX_ZOOM)
	};
}

/**
 * Adds `initial` to the map and returns a function that swaps the shown base
 * layer for another. Switching to the layer already shown does nothing.
 *
 * @param onSwitch runs after the new layer is added — the detail and overview
 *   maps drop their static hero here, since it only matches the first layer.
 * @param maxZoom when given, the map's max zoom follows the shown layer, and a
 *   view deeper than the new layer's tiles is pulled back up to it rather than
 *   left on blank tiles.
 */
export function baseLayerSwitcher(
	map: Leaflet.Map,
	layers: Record<BaseLayer, Leaflet.Layer>,
	initial: BaseLayer,
	{ onSwitch, maxZoom }: { onSwitch?: () => void; maxZoom?: (layer: BaseLayer) => number } = {}
): (next: BaseLayer) => void {
	let current = initial;
	layers[initial].addTo(map);
	return (next) => {
		if (next === current) return;
		layers[current].remove();
		layers[next].addTo(map);
		onSwitch?.();
		if (maxZoom) {
			const max = maxZoom(next);
			map.setMaxZoom(max);
			if (map.getZoom() > max) map.setZoom(max);
		}
		current = next;
	};
}

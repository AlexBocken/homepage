/**
 * GPS hover wiring shared by the workout detail route and the public share
 * view. Both render a Leaflet route map plus pace/elevation/cadence charts; this
 * module keeps a moving pin on the map in sync with whichever graph (or the map
 * itself) the pointer is over, via a {@link TrackHoverStore} cursor keyed by
 * GPS-track point index.
 *
 * Mirrors the hike map↔chart tracking (see `components/hikes/HikeMap.svelte`),
 * adapted for the fitness side: charts are downsampled, so each chart sample
 * carries its originating track index (`idx`) and we translate in both
 * directions through that.
 */

import { TILE_URL, ROUTE_COLOR, ROUTE_CASING } from '$lib/data/mapTiles';
import type { TrackHoverStore } from '$lib/stores/trackHover.svelte';
import type { Attachment } from 'svelte/attachments';

interface TrackPoint {
	lat: number;
	lng: number;
	altitude?: number;
	cadence?: number;
	timestamp: number;
}

/** Any downsampled chart sample that remembers which track point it came from. */
interface TrackSample {
	idx: number;
}

const SNAP_PX = 70;

/**
 * Map the shared cursor onto a chart point index for the chart identified by
 * `key`. Returns:
 *  - `undefined` → this chart is the one being pointed at; leave its native
 *    hover/tooltip alone (don't fight Chart.js).
 *  - `null` → no cursor; clear any highlight.
 *  - number → highlight this chart point (nearest sample to the hovered track point).
 */
export function graphHoverIndex(
	store: TrackHoverStore,
	points: TrackSample[],
	key: string
): number | null | undefined {
	const { index, source } = store.hover;
	if (index == null) return null;
	if (source === key) return undefined;
	if (!points.length) return null;
	let best = 0;
	let bestD = Infinity;
	for (let k = 0; k < points.length; k++) {
		const d = Math.abs(points[k].idx - index);
		if (d < bestD) {
			bestD = d;
			best = k;
		}
	}
	return best;
}

/** Push a chart's hover (a chart point index, or null on leave) into the cursor. */
export function onGraphHover(
	store: TrackHoverStore,
	points: TrackSample[],
	chartIdx: number | null,
	key: string
): void {
	if (chartIdx == null || !points[chartIdx]) {
		if (store.hover.source === key) store.clearHover();
		return;
	}
	store.setHover(points[chartIdx].idx, key);
}

/**
 * Svelte attachment that renders the route map and keeps a hover pin synced to
 * `store`. The map also drives the cursor: moving over the route snaps the pin
 * (and every chart) to the nearest track point.
 */
export function attachTrackMap(
	track: TrackPoint[],
	store: TrackHoverStore,
	opts: { interactive?: boolean } = {}
): Attachment<HTMLElement> {
	const interactive = opts.interactive !== false;
	return (node) => {
		let map: any;
		let cancelled = false;
		let stop: (() => void) | undefined;

		(async () => {
			const L = await import('leaflet');
			if (cancelled || !node.isConnected) return;

			// A non-interactive map is locked to the route's fit — no pan/zoom.
			map = L.map(node, {
				attributionControl: false,
				zoomControl: false,
				...(interactive
					? {}
					: {
							dragging: false,
							scrollWheelZoom: false,
							doubleClickZoom: false,
							boxZoom: false,
							keyboard: false,
							touchZoom: false
						})
			});
			L.tileLayer(TILE_URL.karte, { maxZoom: 19 }).addTo(map);

			const latLngs = track.map((p) => [p.lat, p.lng] as [number, number]);
			// White casing under the red route for high contrast on any map surface.
			L.polyline(latLngs, { color: ROUTE_CASING, weight: 7, opacity: 0.9 }).addTo(map);
			const polyline = L.polyline(latLngs, { color: ROUTE_COLOR, weight: 3.5 }).addTo(map);
			L.circleMarker(latLngs[0], { radius: 5, fillColor: '#a3be8c', fillOpacity: 1, color: '#fff', weight: 2 }).addTo(map);
			L.circleMarker(latLngs[latLngs.length - 1], { radius: 5, fillColor: '#bf616a', fillOpacity: 1, color: '#fff', weight: 2 }).addTo(map);
			map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

			// Static maps need no hover pin / cursor wiring.
			if (!interactive) return;

			const hoverIcon = L.divIcon({
				className: 'run-hover-pin',
				html:
					'<svg viewBox="0 0 24 24" aria-hidden="true">' +
					'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill="currentColor" stroke="rgba(0,0,0,0.35)" stroke-width="1.25" stroke-linejoin="round"/>' +
					'<circle cx="12" cy="10" r="3" fill="#fff"/>' +
					'</svg>',
				iconSize: [28, 34],
				iconAnchor: [14, 32]
			});
			const hoverMarker = L.marker(latLngs[0], {
				icon: hoverIcon,
				interactive: false,
				keyboard: false,
				zIndexOffset: 1000
			});

			// Cache projected pixel positions so map-hover can snap to the nearest
			// track point without reprojecting on every mousemove.
			let projected: { x: number; y: number }[] = [];
			const reproject = () => {
				projected = latLngs.map((ll) => map.latLngToLayerPoint(ll));
			};
			reproject();
			map.on('zoomend moveend', reproject);

			map.on('mousemove', (e: { layerPoint: { x: number; y: number } }) => {
				if (!projected.length) return;
				const { x, y } = e.layerPoint;
				let best = 0;
				let bestSq = Infinity;
				for (let i = 0; i < projected.length; i++) {
					const dx = projected[i].x - x;
					const dy = projected[i].y - y;
					const sq = dx * dx + dy * dy;
					if (sq < bestSq) {
						bestSq = sq;
						best = i;
					}
				}
				if (bestSq <= SNAP_PX * SNAP_PX) store.setHover(best, 'map');
				else if (store.hover.source === 'map') store.clearHover();
			});
			map.on('mouseout', () => {
				if (store.hover.source === 'map') store.clearHover();
			});

			stop = $effect.root(() => {
				$effect(() => {
					const idx = store.hover.index;
					if (idx == null || idx < 0 || idx >= latLngs.length) {
						hoverMarker.remove();
						return;
					}
					const ll = latLngs[idx];
					hoverMarker.setLatLng(ll);
					hoverMarker.addTo(map);
					// Keep a chart/scroll-driven point on screen; don't fight the
					// user's own panning when the hover came from the map.
					if (store.hover.source !== 'map') {
						const inner = map.getBounds().pad(-0.12);
						if (!inner.contains(ll)) {
							map.panTo(ll, { animate: true, duration: 0.35, easeLinearity: 0.3 });
						}
					}
				});
			});
		})();

		return () => {
			cancelled = true;
			stop?.();
			if (map) map.remove();
		};
	};
}

<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import {
		builder,
		mapView,
		nextWaypointId,
		scheduleSave
	} from './builderStore.svelte';
	import { SAC_TRAIL_COLOR } from '$lib/data/sacColors';
	// Single-point Swisstopo elevation lookups are intentionally NOT used —
	// they returned 0 against WGS-84 inputs in practice, and image waypoints
	// don't need per-point altitudes anyway. Waypoint altitudes flow from
	// the routed-segment elevations that snap-to-route populates on the
	// route polyline; `assembleTrackPoints` falls back to those when the
	// waypoint itself has no `altitude`.

	interface Props {
		/** When set, the next map click writes the clicked lat/lng into the
		 * matching unplaced waypoint (instead of creating a new one). */
		pendingPlacementId?: string | null;
		onPlacementComplete?: () => void;
		onPlacementCancel?: () => void;
	}

	const { pendingPlacementId = null, onPlacementComplete, onPlacementCancel }: Props = $props();

	const pendingWaypoint = $derived(
		pendingPlacementId ? builder.waypoints.find((w) => w.id === pendingPlacementId) ?? null : null
	);


	const SWISSTOPO_FARBE =
		'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
	const SWISSTOPO_ATTRIBUTION =
		'&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">swisstopo</a>';
	// Default view: Switzerland-wide.
	const DEFAULT_CENTER: [number, number] = [46.8, 8.3];
	const DEFAULT_ZOOM = 8;

	const editAttachment: Attachment<HTMLElement> = (node) => {
		let cancelled = false;
		let cleanup: (() => void) | undefined;

		(async () => {
			const L = await import('leaflet');
			if (cancelled || !node.isConnected) return;

			const map = L.map(node, {
				attributionControl: true,
				zoomControl: true,
				preferCanvas: false
			}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

			L.tileLayer(SWISSTOPO_FARBE, {
				maxZoom: 19,
				minZoom: 7,
				attribution: SWISSTOPO_ATTRIBUTION,
				updateWhenZooming: false
			}).addTo(map);

			const markerLayer = L.layerGroup().addTo(map);
			const lineLayer = L.layerGroup().addTo(map);

			function makeNumberedIcon(num: number, thumbnail?: string) {
				if (thumbnail) {
					return L.divIcon({
						className: 'rb-waypoint with-thumb',
						html: `<span class="thumb"><img src="${thumbnail}" alt="" /></span><span class="num">${num}</span>`,
						iconSize: [56, 56],
						iconAnchor: [28, 28]
					});
				}
				return L.divIcon({
					className: 'rb-waypoint',
					html: `<span class="num solo">${num}</span>`,
					iconSize: [28, 28],
					iconAnchor: [14, 28]
				});
			}

			function insertWaypointAfterFullIdx(fullAfterIdx: number, lat: number, lng: number) {
				const id = nextWaypointId();
				const fixedLat = Number(lat.toFixed(6));
				const fixedLng = Number(lng.toFixed(6));
				builder.waypoints.splice(fullAfterIdx + 1, 0, {
					id,
					lat: fixedLat,
					lng: fixedLng,
					timestamp: null
				});
				scheduleSave();
			}

			function attachSegmentClick(
				poly: ReturnType<typeof L.polyline>,
				fullAfterIdx: number
			) {
				poly.on('click', (ev: { latlng: { lat: number; lng: number }; originalEvent?: MouseEvent } & object) => {
					L.DomEvent.stopPropagation(ev as Parameters<typeof L.DomEvent.stopPropagation>[0]);
					insertWaypointAfterFullIdx(fullAfterIdx, ev.latlng.lat, ev.latlng.lng);
				});
			}

			function render() {
				markerLayer.clearLayers();
				lineLayer.clearLayers();

				// Markers per waypoint. Skip unplaced ones — they don't have a
				// usable lat/lng and live only in the waypoint table.
				const placedIndices: number[] = [];
				builder.waypoints.forEach((w, idx) => {
					if (w.unplaced) return;
					placedIndices.push(idx);
				});
				placedIndices.forEach((idx, displayPos) => {
					const w = builder.waypoints[idx];
					const marker = L.marker([w.lat, w.lng], {
						icon: makeNumberedIcon(displayPos + 1, w.thumbnail),
						draggable: true
					}).addTo(markerLayer);
					marker.on('dragend', () => {
						const p = marker.getLatLng();
						const wp = builder.waypoints[idx];
						wp.lat = Number(p.lat.toFixed(6));
						wp.lng = Number(p.lng.toFixed(6));
						wp.altitude = undefined;
						scheduleSave();
						render();
					});
					marker.on('contextmenu', () => {
						builder.waypoints.splice(idx, 1);
						scheduleSave();
						render();
					});
				});

				// Lines: per-pair so each can carry a segIdx for inline insertion.
				// Snapped + linear segments share the same visual styling — there's
				// no need to call out the difference, the user picked the mode.
				// SAC white-red-white red — matches /hikes overview + detail-page
				// trail colour so the live preview reads as the final published track.
				const trackColor = SAC_TRAIL_COLOR.T2;
				if (builder.routedSegments.length > 0) {
					builder.routedSegments.forEach((seg, segIdx) => {
						const latLngs = seg.map((p) => [p[1], p[0]] as [number, number]);
						const poly = L.polyline(latLngs, {
							color: trackColor,
							weight: 4,
							opacity: 0.9
						}).addTo(lineLayer);
						// Routed segments index aligns with placed-only pairs; map back
						// to the full waypoint-array index so inline insertion still
						// places the new waypoint correctly relative to unplaced ones.
						const fullAfterIdx = placedIndices[segIdx];
						attachSegmentClick(poly, fullAfterIdx);
					});
				}
			}

			function fitToTrack() {
				const points: [number, number][] = [];
				for (const w of builder.waypoints) {
					if (w.unplaced) continue;
					points.push([w.lat, w.lng]);
				}
				for (const seg of builder.routedSegments) {
					for (const p of seg) points.push([p[1], p[0]]);
				}
				if (points.length === 0) return;
				if (points.length === 1) {
					map.setView(points[0], 13);
					return;
				}
				map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
			}

			// React to store changes.
			const stopRoot = $effect.root(() => {
				$effect(() => {
					// Touch each reactive field so we re-render on any mutation.
					builder.waypoints.length;
					for (const w of builder.waypoints) {
						w.lat; w.lng; w.thumbnail;
					}
					builder.routedSegments.length;
					render();
				});

				// External fit-bounds requests (image drops, GPX imports).
				// The map's own init-time auto-fit covers first-load; this
				// effect handles every subsequent batch insertion.
				let lastTick = mapView.fitTick;
				$effect(() => {
					const tick = mapView.fitTick;
					if (tick === lastTick) return;
					lastTick = tick;
					fitToTrack();
				});
			});

			// Click on blank map. In normal mode, append a new waypoint at the end.
			// When a placement is pending (the user clicked "Auf Karte platzieren"
			// on an unplaced image in the waypoint table), instead drop the
			// clicked lat/lng into that existing waypoint — preserving its
			// chronological position in the table.
			map.on('click', async (e: { latlng: { lat: number; lng: number }; originalEvent: MouseEvent }) => {
				if (e.originalEvent.shiftKey) return;
				const lat = Number(e.latlng.lat.toFixed(6));
				const lng = Number(e.latlng.lng.toFixed(6));

				if (pendingPlacementId) {
					const wp = builder.waypoints.find((w) => w.id === pendingPlacementId);
					if (!wp) return;
					wp.lat = lat;
					wp.lng = lng;
					wp.unplaced = false;
					scheduleSave();
					onPlacementComplete?.();
					return;
				}

				const id = nextWaypointId();
				builder.waypoints.push({ id, lat, lng, timestamp: null });
				scheduleSave();
			});

			// Auto-fit once when waypoints first exist.
			if (builder.waypoints.length >= 2) {
				const bounds = L.latLngBounds(builder.waypoints.map((w) => [w.lat, w.lng]));
				map.fitBounds(bounds, { padding: [40, 40] });
			} else if (builder.waypoints.length === 1) {
				const w = builder.waypoints[0];
				map.setView([w.lat, w.lng], 13);
			}

			cleanup = () => {
				stopRoot();
				map.remove();
			};
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	};
</script>

<div class="edit-map-wrap" class:placement-mode={!!pendingWaypoint}>
	<div class="edit-map" {@attach editAttachment}></div>
	{#if pendingWaypoint}
		<div class="placement-banner" role="status">
			<span>Klicke auf die Karte, um <strong>das Bild</strong> zu platzieren.</span>
			<button type="button" onclick={() => onPlacementCancel?.()}>Abbrechen</button>
		</div>
	{/if}
</div>

<style>
	.edit-map-wrap {
		position: relative;
	}

	.edit-map {
		width: 100%;
		height: 600px;
		border-radius: var(--radius-card);
		overflow: hidden;
		box-shadow: var(--shadow-md);
		background: var(--color-bg-elevated);
	}

	@media (max-width: 900px) {
		.edit-map {
			height: 480px;
		}
	}

	.edit-map-wrap.placement-mode :global(.leaflet-container) {
		cursor: crosshair;
	}

	.placement-banner {
		position: absolute;
		top: 0.75rem;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		gap: 0.75rem;
		align-items: center;
		padding: 0.5rem 0.9rem;
		background: var(--color-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		box-shadow: var(--shadow-md);
		font-size: 0.85rem;
		z-index: 500;
		max-width: calc(100% - 2rem);
	}

	.placement-banner button {
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
	}

	/* DON'T override `position` here — Leaflet sets `.leaflet-marker-icon` to
	 * `position: absolute` for placement, and the inner `.num` badge relies on
	 * that same ancestor as its abs-positioning context. Reassigning to
	 * `position: relative` causes markers to fall into normal flow and stack
	 * vertically instead of sitting at their lat/lng. */
	:global(.rb-waypoint) {
		background: transparent !important;
		border: 0 !important;
	}

	:global(.rb-waypoint .num) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.4em;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.75rem;
		font-weight: 700;
		border: 2px solid var(--color-surface);
		box-shadow: var(--shadow-sm);
	}

	:global(.rb-waypoint .num.solo) {
		min-width: 24px;
		height: 24px;
		border-radius: 12px;
	}

	:global(.rb-waypoint.with-thumb .num) {
		position: absolute;
		top: -6px;
		right: -6px;
		min-width: 20px;
		height: 20px;
		border-radius: 10px;
	}

	:global(.rb-waypoint .thumb) {
		display: block;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 2px solid var(--color-surface);
		box-shadow: var(--shadow-sm);
	}

	:global(.rb-waypoint .thumb img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>

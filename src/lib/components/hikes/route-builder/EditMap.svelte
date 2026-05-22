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

	const TRACK_COLOR = SAC_TRAIL_COLOR.T2;
	const ACCENT_COLOR = '#2965c8'; // SAC T4 blue — used for the focused-marker accent ring

	function escapeAttr(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
	}

	// Pin geometry:
	//   - Solo pin: 28 wide × 36 tall, head r=10 at (14,14), tip at (14,36).
	//   - Image pin: 44 wide × 52 tall, head r=15 (clip) inside r=18 (frame)
	//     at (22,22), tip at (22,52).
	// Both anchor at the tip so `iconAnchor = [width/2, height]`.
	function makePinIcon(num: number, opts: { active: boolean }) {
		const ring = opts.active ? ACCENT_COLOR : 'white';
		const ringWidth = opts.active ? 3 : 2;
		const html = `
			<svg viewBox="0 0 28 36" width="28" height="36" class="rb-pin solo${opts.active ? ' is-active' : ''}" aria-hidden="true">
				<path d="M14 36 L5.1 18.5 A10 10 0 1 1 22.9 18.5 Z"
					fill="${TRACK_COLOR}" stroke="${ring}" stroke-width="${ringWidth}" stroke-linejoin="round" />
				<text x="14" y="17.6" text-anchor="middle" font-size="11" font-weight="700"
					fill="white" font-family="ui-sans-serif,system-ui,Helvetica,Arial,sans-serif">${num}</text>
			</svg>`;
		return { html, size: [28, 36] as [number, number], anchor: [14, 36] as [number, number] };
	}

	function makeImagePinIcon(num: number, thumb: string, opts: { active: boolean }) {
		const safeThumb = escapeAttr(thumb);
		const ring = opts.active ? ACCENT_COLOR : TRACK_COLOR;
		const ringWidth = opts.active ? 3 : 2.5;
		const clipId = `rb-pin-head-${Math.random().toString(36).slice(2, 8)}`;
		const html = `
			<svg viewBox="0 0 44 52" width="44" height="52" class="rb-pin image${opts.active ? ' is-active' : ''}" aria-hidden="true">
				<defs>
					<clipPath id="${clipId}"><circle cx="22" cy="22" r="15" /></clipPath>
				</defs>
				<path d="M22 52 L7.6 32.8 A18 18 0 1 1 36.4 32.8 Z"
					fill="white" stroke="${ring}" stroke-width="${ringWidth}" stroke-linejoin="round" />
				<image href="${safeThumb}" x="7" y="7" width="30" height="30"
					clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice" />
				<g transform="translate(34 9)">
					<circle r="7.5" fill="${ring}" stroke="white" stroke-width="1.5" />
					<text y="3" text-anchor="middle" font-size="9" font-weight="700" fill="white"
						font-family="ui-sans-serif,system-ui,Helvetica,Arial,sans-serif">${num}</text>
				</g>
			</svg>`;
		return { html, size: [44, 52] as [number, number], anchor: [22, 52] as [number, number] };
	}

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

			// Map of waypointId → marker, kept in sync by render(). Used by the
			// focus effect so it can pan/zoom + style the marker for `mapView.focusId`
			// without forcing a full re-render of every marker.
			const markerByWp = new Map<string, ReturnType<typeof L.marker>>();

			function buildIcon(num: number, wp: { thumbnail?: string }, active: boolean) {
				const spec = wp.thumbnail
					? makeImagePinIcon(num, wp.thumbnail, { active })
					: makePinIcon(num, { active });
				return L.divIcon({
					className: 'rb-waypoint',
					html: spec.html,
					iconSize: spec.size,
					iconAnchor: spec.anchor
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
				markerByWp.clear();

				// Markers per waypoint. Skip unplaced ones — they don't have a
				// usable lat/lng and live only in the waypoint table.
				const placedIndices: number[] = [];
				builder.waypoints.forEach((w, idx) => {
					if (w.unplaced) return;
					placedIndices.push(idx);
				});
				const focusId = mapView.focusId;
				placedIndices.forEach((idx, displayPos) => {
					const w = builder.waypoints[idx];
					const seqNum = displayPos + 1;
					const marker = L.marker([w.lat, w.lng], {
						icon: buildIcon(seqNum, w, w.id === focusId),
						draggable: true,
						// Lift the focused marker above its neighbours so its accent
						// ring isn't covered by an adjacent unfocused pin.
						zIndexOffset: w.id === focusId ? 1000 : 0
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
					marker.on('click', () => {
						mapView.focusId = w.id;
						mapView.focusTick++;
					});
					markerByWp.set(w.id, marker);
				});

				// Lines: per-pair so each can carry a segIdx for inline insertion.
				// Snapped + linear segments share the same visual styling — there's
				// no need to call out the difference, the user picked the mode.
				// SAC white-red-white red — matches /hikes overview + detail-page
				// trail colour so the live preview reads as the final published track.
				if (builder.routedSegments.length > 0) {
					builder.routedSegments.forEach((seg, segIdx) => {
						const latLngs = seg.map((p) => [p[1], p[0]] as [number, number]);
						const poly = L.polyline(latLngs, {
							color: TRACK_COLOR,
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

			function focusOnWaypoint(id: string | null) {
				if (!id) return;
				const wp = builder.waypoints.find((w) => w.id === id);
				if (!wp || wp.unplaced) return;
				// Zoom in but don't over-zoom — 16 reads as "this trail junction"
				// without losing surrounding context. flyTo gives smooth motion.
				const targetZoom = Math.max(map.getZoom(), 16);
				map.flyTo([wp.lat, wp.lng], targetZoom, { duration: 0.6 });
			}

			// React to store changes.
			const stopRoot = $effect.root(() => {
				$effect(() => {
					// Touch each reactive field so we re-render on any mutation,
					// including focus changes (so the active marker re-styles).
					builder.waypoints.length;
					for (const w of builder.waypoints) {
						w.lat; w.lng; w.thumbnail;
					}
					builder.routedSegments.length;
					mapView.focusId;
					render();
				});

				// External fit-bounds requests (image drops, GPX imports).
				// The map's own init-time auto-fit covers first-load; this
				// effect handles every subsequent batch insertion.
				let lastFitTick = mapView.fitTick;
				$effect(() => {
					const tick = mapView.fitTick;
					if (tick === lastFitTick) return;
					lastFitTick = tick;
					fitToTrack();
				});

				// Focus requests (table row "fokussieren", prev/next nav bar).
				// Tick is bumped on every request even if the id stays the same
				// so repeated clicks re-center even if the user panned away.
				let lastFocusTick = mapView.focusTick;
				$effect(() => {
					const tick = mapView.focusTick;
					if (tick === lastFocusTick) return;
					lastFocusTick = tick;
					focusOnWaypoint(mapView.focusId);
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
		height: 640px;
		border-radius: var(--radius-card);
		overflow: hidden;
		box-shadow: var(--shadow-md);
		background: var(--color-bg-elevated);
	}

	@media (max-width: 900px) {
		.edit-map {
			height: 520px;
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

	/* Leaflet wraps each marker in `.leaflet-marker-icon` with its own
	 * absolute positioning. We just neutralise its default frame/background
	 * so the SVG pin shows through cleanly. */
	:global(.rb-waypoint) {
		background: transparent !important;
		border: 0 !important;
	}

	:global(.rb-pin) {
		display: block;
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
		transition: filter 200ms ease, transform 200ms ease;
		transform-origin: 50% 100%;
	}

	:global(.rb-waypoint:hover .rb-pin) {
		transform: scale(1.08);
	}

	:global(.rb-pin.is-active) {
		filter: drop-shadow(0 0 6px color-mix(in oklab, #2965c8 70%, transparent))
			drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
		animation: rb-pin-bounce 0.55s ease-out;
	}

	@keyframes rb-pin-bounce {
		0%   { transform: scale(0.85) translateY(-4px); }
		60%  { transform: scale(1.12); }
		100% { transform: scale(1); }
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.rb-pin.is-active) {
			animation: none;
		}
	}
</style>

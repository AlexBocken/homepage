<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { HikeTrackPoint, ImagePoint } from '$types/hikes';
	import { hover, setHover, clearHover } from './hoverStore.svelte';
	import { focused, setFocused, clearFocused } from './focusedImageStore.svelte';
	import Map from '@lucide/svelte/icons/map';
	import Satellite from '@lucide/svelte/icons/satellite';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Layers from '@lucide/svelte/icons/layers';
	import Camera from '@lucide/svelte/icons/camera';
	import CameraOff from '@lucide/svelte/icons/camera-off';
	import Locate from '@lucide/svelte/icons/locate';
	import LocateOff from '@lucide/svelte/icons/locate-off';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';

	interface Props {
		track: HikeTrackPoint[];
		imagePoints?: ImagePoint[];
		/** When false, private images are hidden — anonymous viewers only see
		 * public ones. Logged-in users get the full set. */
		showPrivate?: boolean;
	}

	const { track, imagePoints = [], showPrivate = false }: Props = $props();

	// User-location toggle moved inside the map UI. localStorage-persisted so
	// returning visitors get the same state. Permission errors surface as a
	// small inline message just under the controls.
	const GPS_STORAGE_KEY = 'hikes:gpsEnabled';
	let enableUserLocation = $state(false);
	let locationError = $state<string | null>(null);

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (window.localStorage.getItem(GPS_STORAGE_KEY) === '1') enableUserLocation = true;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(GPS_STORAGE_KEY, enableUserLocation ? '1' : '0');
	});

	// Close the layer menu when clicking anywhere outside of it. The opening
	// click on the button calls stopPropagation, so this handler never sees
	// the click that flipped layerMenuOpen to true.
	$effect(() => {
		if (!layerMenuOpen) return;
		function onAway(e: MouseEvent) {
			const target = e.target as HTMLElement | null;
			if (target && !target.closest('.layer-menu')) {
				layerMenuOpen = false;
			}
		}
		window.addEventListener('click', onAway);
		return () => window.removeEventListener('click', onAway);
	});

	function toggleLocation() {
		if (enableUserLocation) {
			enableUserLocation = false;
			locationError = null;
			return;
		}
		if (typeof window === 'undefined') return;
		const hasTauri = '__TAURI_INTERNALS__' in window;
		const hasWebGeo = 'geolocation' in navigator;
		if (!hasTauri && !hasWebGeo) {
			locationError = 'Geolocation steht in diesem Browser nicht zur Verfügung.';
			return;
		}
		locationError = null;
		enableUserLocation = true;
	}

	const SWISSTOPO_FARBE = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
	const SWISSTOPO_IMAGE = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg';
	const SWISSTOPO_DUFOUR = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hiks-dufour/default/current/3857/{z}/{x}/{y}.png';
	const SWISSTOPO_ATTRIBUTION = '&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">swisstopo</a>';

	type BaseLayer = 'schematic' | 'aerial' | 'dufour';
	const LAYER_DEFS: Record<BaseLayer, { label: string; icon: typeof Map; maxZoom: number }> = {
		schematic: { label: 'Karte', icon: Map, maxZoom: 19 },
		aerial: { label: 'Luftbild', icon: Satellite, maxZoom: 19 },
		// Dufour Map (1845–1864): swisstopo's historical layer, only goes up
		// to roughly z16. We cap the map's maxZoom when this layer is active.
		dufour: { label: 'Dufour (1864)', icon: Landmark, maxZoom: 16 }
	};

	let showPhotos = $state(true);
	let baseLayer = $state<BaseLayer>('schematic');
	let layerMenuOpen = $state(false);
	// Re-fit-bounds callback — populated once the map and polyline are
	// alive inside the Leaflet attachment. Null until then so the button
	// can be hidden / disabled.
	let recenterMap = $state<(() => void) | null>(null);

	// Cleanup hover/focus state when the component unmounts.
	$effect(() => {
		return () => {
			clearHover();
			clearFocused();
		};
	});

	// The strip and the map share `focused` via the focusedImageStore. The map
	// owns the visible filtered list internally; the strip works against the
	// same filtered list, so the index is consistent between them.

	const mapAttachment: Attachment<HTMLElement> = (node) => {
		let cleanup: (() => void) | undefined;
		let cancelled = false;

		(async () => {
			const L = await import('leaflet');
			if (cancelled || !node.isConnected) return;

			const latLngs: [number, number][] = track.map((p) => [p[1], p[0]]);

			const map = L.map(node, {
				attributionControl: true,
				zoomControl: true,
				preferCanvas: true
			});

			const tileLayers: Record<BaseLayer, ReturnType<typeof L.tileLayer>> = {
				schematic: L.tileLayer(SWISSTOPO_FARBE, {
					maxZoom: LAYER_DEFS.schematic.maxZoom,
					minZoom: 7,
					attribution: SWISSTOPO_ATTRIBUTION,
					updateWhenZooming: false
				}),
				aerial: L.tileLayer(SWISSTOPO_IMAGE, {
					maxZoom: LAYER_DEFS.aerial.maxZoom,
					minZoom: 7,
					attribution: SWISSTOPO_ATTRIBUTION,
					updateWhenZooming: false
				}),
				dufour: L.tileLayer(SWISSTOPO_DUFOUR, {
					maxZoom: LAYER_DEFS.dufour.maxZoom,
					minZoom: 7,
					attribution: SWISSTOPO_ATTRIBUTION,
					updateWhenZooming: false
				})
			};
			tileLayers.schematic.addTo(map);
			let currentBase: BaseLayer = 'schematic';

			// Canvas-rendered polylines can't resolve CSS custom properties, so read
			// the trail color from the document at mount time. Nord red contrasts
			// strongly against both the schematic map and the aerial imagery.
			const trailColor =
				getComputedStyle(document.documentElement).getPropertyValue('--red').trim() ||
				'#bf616a';

			const polyline = L.polyline(latLngs, {
				color: trailColor,
				weight: 4,
				opacity: 0.95
			}).addTo(map);

			L.circleMarker(latLngs[0], {
				radius: 6,
				fillColor: '#a3be8c',
				fillOpacity: 1,
				color: '#fff',
				weight: 2
			}).addTo(map);
			L.circleMarker(latLngs[latLngs.length - 1], {
				radius: 6,
				fillColor: '#bf616a',
				fillOpacity: 1,
				color: '#fff',
				weight: 2
			}).addTo(map);
			const initialBounds = polyline.getBounds();
			map.fitBounds(initialBounds, { padding: [24, 24] });

			// Expose a re-focus callback that re-fits the polyline bounds —
			// the same view the user started with after dragging or zooming
			// somewhere else. Smooth flyToBounds rather than instant fit so
			// the transition reads as a deliberate gesture.
			recenterMap = () => {
				map.flyToBounds(initialBounds, {
					padding: [24, 24],
					duration: 0.6,
					easeLinearity: 0.25
				});
			};

			// Hovered-vertex marker (driven by the shared hover store). Rendered
			// as a lucide MapPin in a divIcon so its tip aligns with the actual
			// track point — circle markers were ambiguous about which lat/lng
			// they were claiming.
			const hoverIcon = L.divIcon({
				className: 'hike-hover-pin',
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

			// Image markers — compact camera badges. The full image lives in the
			// HikePhotoStage below the strip, so the map keeps the trail visible.
			// Hovering or clicking a marker just writes to the focus store; the
			// stage and strip react.
			let photoLayer = L.layerGroup().addTo(map);
			// Parallel arrays: the visible subset of imagePoints (post visibility
			// filter) and the Leaflet markers we built for them. Their indices
			// match what the photo strip is using, so a strip-side `focused.index`
			// maps directly into `visibleMarkers`.
			let visiblePoints: ImagePoint[] = [];
			let visibleMarkers: ReturnType<typeof L.marker>[] = [];

			// Lucide Camera path, inlined so the divIcon stays self-contained.
			const cameraSvg =
				'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
				'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>' +
				'<circle cx="12" cy="13" r="3"/>' +
				'</svg>';

			function renderPhotos() {
				photoLayer.clearLayers();
				visiblePoints = [];
				visibleMarkers = [];
				if (!showPhotos) return;
				for (const ip of imagePoints) {
					if (ip.visibility === 'private' && !showPrivate) continue;
					const visibleIdx = visiblePoints.length;
					visiblePoints.push(ip);
					const altSafe = ip.alt.replace(/"/g, '&quot;');
					const isPrivate = ip.visibility === 'private';
					const icon = L.divIcon({
						className: `hike-photo-marker${isPrivate ? ' is-private' : ''}`,
						html: `<span class="badge" title="${altSafe}">${cameraSvg}</span>`,
						iconSize: [28, 28],
						iconAnchor: [14, 14]
					});
					const marker = L.marker([ip.lat, ip.lng], { icon });
					marker.on('mouseover', () => {
						// Hover preview → stage. Distinct source so the strip
						// skips scroll (jerky across dense clusters) and the
						// map skips its own flyTo + focus ring.
						setFocused(visibleIdx, 'map-hover');
						// Also drive the chart cursor via the nearest track sample.
						if (typeof ip.timestamp !== 'number') return;
						let bestIdx = 0;
						let bestDelta = Infinity;
						for (let i = 0; i < track.length; i++) {
							const t = track[i][3];
							if (typeof t !== 'number') continue;
							const d = Math.abs(t - ip.timestamp);
							if (d < bestDelta) {
								bestDelta = d;
								bestIdx = i;
							}
						}
						setHover(bestIdx, 'image');
					});
					// Clear chart hover but keep `focused` sticky so the stage
					// keeps showing the last hovered image.
					marker.on('mouseout', () => clearHover());
					// Click (touch fallback): same semantics as a strip click —
					// scroll the strip card into view and centre the map.
					marker.on('click', () => setFocused(visibleIdx, 'map'));
					marker.addTo(photoLayer);
					visibleMarkers.push(marker);
				}
			}
			renderPhotos();

			// Focus ring: a non-vector divIcon (so we can CSS-animate it under
			// Leaflet's canvas renderer). Created lazily on first focus.
			const focusIcon = L.divIcon({
				className: 'hike-photo-focus-ring',
				html: '<div class="ring"></div><div class="ring delay"></div>',
				iconSize: [80, 80],
				iconAnchor: [40, 40]
			});
			let focusMarker: ReturnType<typeof L.marker> | null = null;

			// React to the shared hover store: drive the polyline cursor marker.
			// When the hover comes from the chart and the point is outside the
			// currently-visible map area, pan the map so the pin stays in view —
			// using `pad(-0.12)` shrinks the trigger bounds so we pan a touch
			// before the pin actually hits the edge.
			const stopHoverEffect = $effect.root(() => {
				$effect(() => {
					if (hover.source === 'map') return;
					if (hover.index === null || hover.index < 0 || hover.index >= latLngs.length) {
						hoverMarker.remove();
						return;
					}
					const ll = latLngs[hover.index];
					hoverMarker.setLatLng(ll);
					hoverMarker.addTo(map);
					if (hover.source === 'chart' || hover.source === 'scroll') {
						const inner = map.getBounds().pad(-0.12);
						if (!inner.contains(ll)) {
							map.panTo(ll, { animate: true, duration: 0.35, easeLinearity: 0.3 });
						}
					}
				});
			});

			// React to the shared focus store: when the strip selects a photo we
			// fly the map there and drop a pulsing focus ring on top of the marker.
			// Map-side writes (hover or click) are ignored — the user is already
			// looking at that marker, no need to pan or ring it.
			const stopFocusEffect = $effect.root(() => {
				$effect(() => {
					const idx = focused.index;
					if (focused.source === 'map' || focused.source === 'map-hover') return;
					if (idx === null || idx < 0 || idx >= visiblePoints.length) {
						if (focusMarker) {
							focusMarker.remove();
							focusMarker = null;
						}
						return;
					}
					const ip = visiblePoints[idx];
					// For inline-scroll focus changes we don't want to fly the map
					// on every image boundary — the continuous scroll-pin already
					// shows the reader where they are. Only fly if the focused
					// marker is currently off the visible viewport. Other sources
					// (strip click, chevron, keyboard) keep the full flyTo so the
					// gesture feels deliberate.
					const target: [number, number] = [ip.lat, ip.lng];
					const shouldFly =
						focused.source !== 'inline' || !map.getBounds().pad(-0.05).contains(target);
					if (shouldFly) {
						map.flyTo(target, Math.max(map.getZoom(), 15), {
							duration: 0.7,
							easeLinearity: 0.25
						});
					}
					if (!focusMarker) {
						focusMarker = L.marker([ip.lat, ip.lng], {
							icon: focusIcon,
							interactive: false,
							keyboard: false,
							zIndexOffset: -100
						}).addTo(map);
					} else {
						focusMarker.setLatLng([ip.lat, ip.lng]);
						if (!map.hasLayer(focusMarker)) focusMarker.addTo(map);
					}
				});
			});

			// Polyline hover → write to store.
			polyline.on('mousemove', (e: { latlng: { lat: number; lng: number } }) => {
				let bestIdx = 0;
				let bestSq = Infinity;
				const { lat, lng } = e.latlng;
				for (let i = 0; i < latLngs.length; i++) {
					const dLat = latLngs[i][0] - lat;
					const dLng = latLngs[i][1] - lng;
					const sq = dLat * dLat + dLng * dLng;
					if (sq < bestSq) {
						bestSq = sq;
						bestIdx = i;
					}
				}
				setHover(bestIdx, 'map');
			});
			polyline.on('mouseout', () => clearHover());

			// User location (opt-in).
			let userMarker: ReturnType<typeof L.circleMarker> | null = null;
			let userAccuracyCircle: ReturnType<typeof L.circle> | null = null;
			let userCleanup: (() => void) | undefined;

			async function attachUserLocation() {
				if (!enableUserLocation) return;
				const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
				const handlePos = (lat: number, lng: number, accuracy: number) => {
					if (!userMarker) {
						userMarker = L.circleMarker([lat, lng], {
							radius: 7,
							fillColor: '#5e81ac',
							fillOpacity: 1,
							color: '#fff',
							weight: 2
						}).addTo(map);
						userAccuracyCircle = L.circle([lat, lng], {
							radius: accuracy,
							color: '#5e81ac',
							fillColor: '#5e81ac',
							fillOpacity: 0.1,
							weight: 1
						}).addTo(map);
					} else {
						userMarker.setLatLng([lat, lng]);
						userAccuracyCircle?.setLatLng([lat, lng]);
						userAccuracyCircle?.setRadius(accuracy);
					}
				};
				if (isTauri) {
					try {
						const geo = await import('@tauri-apps/plugin-geolocation');
						const watchId = await geo.watchPosition(
							{ enableHighAccuracy: true, maximumAge: 5000, timeout: 10_000 },
							(pos) => {
								if (pos?.coords) handlePos(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? 30);
							}
						);
						userCleanup = () => geo.clearWatch(watchId).catch(() => {});
					} catch {
						/* Tauri plugin unavailable — fall through to web API */
					}
				}
				if (!userCleanup && 'geolocation' in navigator) {
					const id = navigator.geolocation.watchPosition(
						(pos) => handlePos(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
						() => {},
						{ enableHighAccuracy: true, maximumAge: 5000, timeout: 10_000 }
					);
					userCleanup = () => navigator.geolocation.clearWatch(id);
				}
			}
			attachUserLocation();

			// React to user-toggle of photo markers, base-layer choice, and the
			// enableUserLocation prop.
			const stopReactRoot = $effect.root(() => {
				$effect(() => {
					renderPhotos();
				});
				$effect(() => {
					if (baseLayer === currentBase) return;
					tileLayers[currentBase].remove();
					tileLayers[baseLayer].addTo(map);
					// Each historical layer caps out at a lower zoom — clamp the
					// map so we don't end up on a blank tile, and force the
					// current zoom back down if it's beyond the new ceiling.
					const newMax = LAYER_DEFS[baseLayer].maxZoom;
					map.setMaxZoom(newMax);
					if (map.getZoom() > newMax) map.setZoom(newMax);
					currentBase = baseLayer;
				});
				$effect(() => {
					if (!enableUserLocation && userCleanup) {
						userCleanup();
						userCleanup = undefined;
						if (userMarker) userMarker.remove();
						if (userAccuracyCircle) userAccuracyCircle.remove();
						userMarker = null;
						userAccuracyCircle = null;
					} else if (enableUserLocation && !userCleanup) {
						attachUserLocation();
					}
				});
			});

			cleanup = () => {
				userCleanup?.();
				stopHoverEffect();
				stopFocusEffect();
				stopReactRoot();
				if (focusMarker) focusMarker.remove();
				recenterMap = null;
				map.remove();
			};
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	};
</script>

<div class="map-wrap">
	<div class="map" {@attach mapAttachment}></div>

	<div class="map-controls">
		<div class="layer-menu" class:open={layerMenuOpen}>
			<button
				type="button"
				class="round-btn"
				aria-label="Kartenebene wählen"
				aria-haspopup="menu"
				aria-expanded={layerMenuOpen}
				onclick={(e) => {
					e.stopPropagation();
					layerMenuOpen = !layerMenuOpen;
				}}
			>
				<Layers size={20} strokeWidth={2} aria-hidden="true" />
			</button>
			{#if layerMenuOpen}
				<div class="layer-popover" role="menu">
					{#each Object.entries(LAYER_DEFS) as [key, def] (key)}
						{@const Icon = def.icon}
						<button
							type="button"
							role="menuitemradio"
							aria-checked={baseLayer === key}
							class:active={baseLayer === key}
							onclick={() => {
								baseLayer = key as BaseLayer;
								layerMenuOpen = false;
							}}
						>
							<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
							{def.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if recenterMap}
			<button
				type="button"
				class="round-btn"
				aria-label="Auf die Tour zurückzentrieren"
				title="Karte auf die gesamte Tour zurückzentrieren"
				onclick={() => recenterMap?.()}
			>
				<Maximize2 size={18} strokeWidth={2} aria-hidden="true" />
			</button>
		{/if}

		{#if imagePoints.length > 0}
			<button
				type="button"
				class="round-btn"
				class:active={showPhotos}
				aria-pressed={showPhotos}
				aria-label={showPhotos ? 'Fotos auf der Karte ausblenden' : 'Fotos auf der Karte anzeigen'}
				title={showPhotos ? 'Fotos auf der Karte ausblenden' : 'Fotos auf der Karte anzeigen'}
				onclick={() => (showPhotos = !showPhotos)}
			>
				{#if showPhotos}
					<Camera size={20} strokeWidth={2} aria-hidden="true" />
				{:else}
					<CameraOff size={20} strokeWidth={2} aria-hidden="true" />
				{/if}
			</button>
		{/if}

		<button
			type="button"
			class="round-btn"
			class:active={enableUserLocation}
			aria-pressed={enableUserLocation}
			title={enableUserLocation
				? 'Eigenen Standort verbergen'
				: 'Eigenen Standort anzeigen — wird lokal berechnet, nicht an Dritte gesendet'}
			aria-label={enableUserLocation ? 'Eigenen Standort verbergen' : 'Eigenen Standort anzeigen'}
			onclick={toggleLocation}
		>
			{#if enableUserLocation}
				<Locate size={20} strokeWidth={2} aria-hidden="true" />
			{:else}
				<LocateOff size={20} strokeWidth={2} aria-hidden="true" />
			{/if}
		</button>
	</div>

	{#if locationError}
		<p class="gps-error" role="status">{locationError}</p>
	{/if}
</div>

<style>
	.map-wrap {
		position: relative;
		width: 100%;
	}

	.map {
		width: 100%;
		height: 520px;
		border-radius: var(--radius-card);
		overflow: hidden;
		box-shadow: var(--shadow-md);
		background: var(--color-bg-elevated);
	}

	@media (max-width: 560px) {
		.map {
			height: 360px;
			border-radius: var(--radius-lg);
		}
	}

	/* Vertical stack of round controls at the bottom-right of the map.
	 * Layer (top) → Camera → GPS (bottom). All three share `.round-btn`
	 * styling; the layer button also anchors a popover menu to its left. */
	.map-controls {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-end;
		z-index: 500;
	}

	.round-btn {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: 50%;
		box-shadow: var(--shadow-md);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			background var(--transition-fast),
			transform var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.round-btn:hover {
		color: var(--color-primary);
		transform: scale(1.05);
		box-shadow: var(--shadow-hover);
	}

	.round-btn.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	.round-btn.active:hover {
		color: var(--color-text-on-primary);
	}

	.layer-menu {
		position: relative;
	}

	.layer-popover {
		position: absolute;
		right: calc(100% + 0.5rem);
		bottom: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.3rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		min-width: 9.5rem;
		white-space: nowrap;
	}

	.layer-popover button {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.7rem;
		border: 0;
		background: transparent;
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.85rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.layer-popover button :global(svg) {
		color: var(--color-text-tertiary);
		flex: 0 0 auto;
	}

	.layer-popover button:hover {
		background: var(--color-bg-elevated);
	}

	.layer-popover button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	.layer-popover button.active :global(svg) {
		color: var(--color-text-on-primary);
	}

	/* GPS-permission error toast — sits above the bottom-right stack of
	 * round controls. Up to four 44 px buttons + three 0.5 rem gaps make the
	 * stack ~216 px tall (incl. the 1 rem bottom inset), so anchor the
	 * toast at 14 rem to clear it with breathing room. */
	.gps-error {
		position: absolute;
		bottom: 14rem;
		right: 1rem;
		max-width: 18rem;
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface);
		color: var(--red);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		font-size: 0.78rem;
		z-index: 500;
	}

	:global(.hike-hover-pin) {
		background: transparent !important;
		border: 0 !important;
		color: var(--color-primary);
		filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.25));
		pointer-events: none;
	}

	:global(.hike-hover-pin svg) {
		display: block;
		width: 28px;
		height: 34px;
	}

	:global(.hike-photo-marker) {
		background: transparent !important;
		border: 0 !important;
	}

	:global(.hike-photo-marker .badge) {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: 2px solid var(--color-surface);
		box-shadow: var(--shadow-sm);
		transition: transform var(--transition-fast), box-shadow var(--transition-fast);
	}

	:global(.hike-photo-marker .badge svg) {
		width: 14px;
		height: 14px;
	}

	:global(.hike-photo-marker:hover .badge) {
		transform: scale(1.15);
		box-shadow: var(--shadow-md);
	}

	:global(.hike-photo-marker.is-private .badge) {
		background: var(--color-bg-elevated);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	/* Focus ring placed by the photo strip → map sync. Two concentric pulses
	 * with staggered animation make the ring feel alive without strobing. */
	:global(.hike-photo-focus-ring) {
		background: transparent !important;
		border: 0 !important;
		pointer-events: none;
	}

	:global(.hike-photo-focus-ring .ring) {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 3px solid var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 14%, transparent);
		animation: hike-photo-focus-pulse 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
	}

	:global(.hike-photo-focus-ring .ring.delay) {
		animation-delay: 0.8s;
	}

	@keyframes hike-photo-focus-pulse {
		0% {
			transform: scale(0.45);
			opacity: 0.95;
		}
		70% {
			opacity: 0.15;
		}
		100% {
			transform: scale(1.25);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.hike-photo-focus-ring .ring) {
			animation: none;
			transform: scale(0.9);
			opacity: 0.55;
		}
	}
</style>

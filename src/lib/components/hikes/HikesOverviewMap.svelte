<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { HikeManifestEntry, Difficulty } from '$types/hikes';
	import Map from '@lucide/svelte/icons/map';
	import Satellite from '@lucide/svelte/icons/satellite';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Layers from '@lucide/svelte/icons/layers';
	import Locate from '@lucide/svelte/icons/locate';
	import LocateOff from '@lucide/svelte/icons/locate-off';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';

	interface Props {
		hikes: HikeManifestEntry[];
		/** Initial map centre `[lat, lng]`. When provided alongside
		 * `initialZoom`, the map opens with `setView(center, zoom)` instead
		 * of `fitBounds(union)` — used by the index page to align Leaflet's
		 * first paint with the SSR-rendered static overview hero. */
		initialCenter?: [number, number];
		initialZoom?: number;
		/** Fires once the schematic tile layer's first batch of tiles has
		 * finished loading — i.e. the map is visually complete. The page
		 * uses this to fade out the SSR-rendered static hero. */
		onReady?: () => void;
	}

	const { hikes, initialCenter, initialZoom, onReady }: Props = $props();

	// Per-tier polyline colour, matching the painted-marker scheme on the
	// SAC badges. Canvas-rendered polylines can't resolve CSS variables,
	// so the values are hard-coded — keep in sync with HikeCard.svelte.
	const SAC_COLOR: Record<Difficulty, string> = {
		T1: '#f5a623',
		T2: '#dc1d2a',
		T3: '#dc1d2a',
		T4: '#2965c8',
		T5: '#2965c8',
		T6: '#2965c8'
	};

	const SWISSTOPO_FARBE = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
	const SWISSTOPO_IMAGE = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg';
	const SWISSTOPO_DUFOUR = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hiks-dufour/default/current/3857/{z}/{x}/{y}.png';
	const SWISSTOPO_ATTRIBUTION =
		'&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">swisstopo</a>';

	type BaseLayer = 'schematic' | 'aerial' | 'dufour';
	const LAYER_DEFS: Record<BaseLayer, { label: string; icon: typeof Map; maxZoom: number }> = {
		schematic: { label: 'Karte', icon: Map, maxZoom: 19 },
		aerial: { label: 'Luftbild', icon: Satellite, maxZoom: 19 },
		dufour: { label: 'Dufour (1864)', icon: Landmark, maxZoom: 16 }
	};

	const GPS_STORAGE_KEY = 'hikes:gpsEnabled';

	let baseLayer = $state<BaseLayer>('schematic');
	let layerMenuOpen = $state(false);
	let enableUserLocation = $state(false);
	let locationError = $state<string | null>(null);
	// Re-fit callback wired up once Leaflet + bounds are alive inside the
	// attachment. Null hides the button.
	let recenterMap = $state<(() => void) | null>(null);

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (window.localStorage.getItem(GPS_STORAGE_KEY) === '1') enableUserLocation = true;
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(GPS_STORAGE_KEY, enableUserLocation ? '1' : '0');
	});

	// Close the layer popover on outside click. The opening click on the
	// button calls stopPropagation so this never sees the click that opened it.
	$effect(() => {
		if (!layerMenuOpen) return;
		function onAway(e: MouseEvent) {
			const target = e.target as HTMLElement | null;
			if (target && !target.closest('.layer-menu')) layerMenuOpen = false;
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

	const mapAttachment: Attachment<HTMLElement> = (node) => {
		let cancelled = false;
		let cleanup: (() => void) | undefined;

		(async () => {
			const L = await import('leaflet');
			if (cancelled || !node.isConnected) return;

			const map = L.map(node, {
				attributionControl: true,
				zoomControl: true,
				preferCanvas: true
			});
			// Sensible default centre (mid-Switzerland) while the polyline
			// layer is built up; `fitBounds` below overrides it once the
			// union bounds are known. If the caller passed a pre-rendered
			// hero pose, use that instead so Leaflet lands aligned with the
			// static image on first paint.
			if (initialCenter && typeof initialZoom === 'number') {
				map.setView(initialCenter, initialZoom, { animate: false });
			} else {
				map.setView([46.8, 8.3], 8);
			}

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

			// Forward-declared so the tile-load handover handler below can
			// close over it; populated once the polyline loop has built the
			// union bounds.
			let initialBounds: ReturnType<typeof L.latLngBounds> | null = null;

			// First-paint handover: when the schematic tile layer finishes
			// loading its initial batch, fire `onReady` (so the static hero
			// can fade out) and — if we opened with `setView` to match a
			// pre-rendered hero — animate to Leaflet's natural `fitBounds`
			// of the union polyline bounds. The fade overlaps with the zoom
			// animation so the user sees the map ease into its final
			// framing as the static dissolves. Mirrors the same pattern in
			// `HikeMap.svelte`.
			tileLayers.schematic.once('load', () => {
				if (!initialCenter || typeof initialZoom !== 'number' || !initialBounds) {
					onReady?.();
					return;
				}
				map.flyToBounds(initialBounds, {
					padding: [32, 32],
					maxZoom: 13,
					duration: 0.9,
					easeLinearity: 0.3
				});
				map.once('moveend', () => {
					let fired = false;
					const fire = () => {
						if (fired) return;
						fired = true;
						onReady?.();
					};
					tileLayers.schematic.once('load', fire);
					setTimeout(fire, 350);
				});
			});

			// One polyline per hike, sourced from the manifest's already-
			// simplified previewPolyline (≤150 points each). The layer is
			// re-populated on every `hikes` prop change (see the $effect
			// below) so toggling filters updates the visible routes — and
			// re-fits the camera to the new union bounds.
			const layer = L.layerGroup().addTo(map);

			function renderPolylines(): boolean {
				layer.clearLayers();
				const b = L.latLngBounds([]);
				for (const hike of hikes) {
					if (!hike.previewPolyline || hike.previewPolyline.length < 2) continue;
					const latLngs = hike.previewPolyline.map(([lat, lng]) => [lat, lng] as [number, number]);
					const color = SAC_COLOR[hike.difficulty] ?? '#5e81ac';
					const poly = L.polyline(latLngs, {
						color,
						weight: 4,
						opacity: 0.9,
						interactive: true
					}).addTo(layer);

					poly.bindTooltip(
						`<strong>${hike.title}</strong><br>` +
							`${hike.distanceKm.toFixed(1)} km · ↑${hike.elevationGainM} m · SAC ${hike.difficulty}`,
						{ sticky: true, direction: 'top', opacity: 0.95, className: 'hike-overview-tooltip' }
					);
					poly.on('mouseover', () => {
						poly.setStyle({ weight: 7, opacity: 1 });
						poly.bringToFront();
					});
					poly.on('mouseout', () => {
						poly.setStyle({ weight: 4, opacity: 0.9 });
					});
					poly.on('click', () => {
						goto(resolve('/hikes/[slug]', { slug: hike.slug }));
					});

					for (const [lat, lng] of latLngs) {
						b.extend([lat, lng]);
					}
				}
				if (b.isValid()) {
					initialBounds = b;
					recenterMap = () => {
						if (!initialBounds) return;
						map.flyToBounds(initialBounds, {
							padding: [32, 32],
							maxZoom: 13,
							duration: 0.6,
							easeLinearity: 0.25
						});
					};
					return true;
				}
				initialBounds = null;
				recenterMap = null;
				return false;
			}

			// Initial paint — no animated fit when the caller handed us a
			// pre-rendered hero pose (the tile-load handover handles the
			// fly-to), otherwise fit straight to the union bounds.
			if (renderPolylines() && (!initialCenter || typeof initialZoom !== 'number') && initialBounds) {
				map.fitBounds(initialBounds, { padding: [32, 32], maxZoom: 13 });
			}

			// User location (opt-in). Same Tauri-first / Web-Geolocation-fallback
			// pattern as HikeMap so the toggle behaves identically across the app.
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
								if (pos?.coords)
									handlePos(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? 30);
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

			// React to control toggles outside the attachment.
			const stopReactRoot = $effect.root(() => {
				// Re-render polylines whenever the `hikes` prop changes
				// (filter bar toggles, tag deep-link). The first $effect
				// run fires immediately and would re-do the initial paint
				// for no UX gain — skip it via a tick counter.
				let rerunTick = 0;
				$effect(() => {
					void hikes;
					if (rerunTick++ === 0) return;
					if (renderPolylines() && initialBounds) {
						// Smooth re-fit so the user sees the camera glide
						// toward whichever subset is now on display.
						map.flyToBounds(initialBounds, {
							padding: [32, 32],
							maxZoom: 13,
							duration: 0.6,
							easeLinearity: 0.25
						});
					}
				});

				$effect(() => {
					if (baseLayer === currentBase) return;
					tileLayers[currentBase].remove();
					tileLayers[baseLayer].addTo(map);
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
				stopReactRoot();
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

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<link rel="preconnect" href="https://wmts.geo.admin.ch" crossorigin="anonymous" />
</svelte:head>

<div class="map-wrap">
	<div class="overview-map" {@attach mapAttachment} aria-label="Übersichtskarte aller Wanderungen"></div>

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
				aria-label="Auf alle Touren zurückzentrieren"
				title="Karte auf alle Touren zurückzentrieren"
				onclick={() => recenterMap?.()}
			>
				<Maximize2 size={18} strokeWidth={2} aria-hidden="true" />
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

	.overview-map {
		width: 100%;
		height: clamp(320px, 50vh, 520px);
		background: var(--color-bg-elevated);
	}

	/* Tooltip lives at body level, so it has to be global. */
	:global(.hike-overview-tooltip) {
		font: inherit;
		font-size: 0.8rem;
		line-height: 1.35;
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-md);
	}

	:global(.hike-overview-tooltip strong) {
		display: block;
		margin-bottom: 0.1rem;
		color: var(--color-text-primary);
	}

	:global(.leaflet-interactive) {
		cursor: pointer;
	}

	/* Bottom-right stack of round controls. Mirrors HikeMap.svelte exactly so
	 * users get the same controls and visual language as the detail page. */
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

	/* GPS-permission error toast. Three 44 px buttons + two 0.5 rem gaps =
	 * ~148 px stack plus 1 rem inset; anchor the toast above that. */
	.gps-error {
		position: absolute;
		bottom: 11rem;
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
</style>

<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type { Attachment } from 'svelte/attachments';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { sacTrailColor } from '$lib/data/sacColors';
	import { isSwissRegion } from '$lib/hikes/hikeArea';
	import { makeBaseLayers, baseLayerSwitcher, baseLayerMaxZoom, type BaseLayer } from '$lib/hikes/mapLayers';
	import { watchUserLocation } from '$lib/hikes/userLocation';
	import MapControls from './MapControls.svelte';
	import LayerMenu from './LayerMenu.svelte';
	import MapLocateButton from './MapLocateButton.svelte';
	import type { HikeManifestEntry } from '$types/hikes';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import { page } from '$app/state';
	import { hikesSlugFromLang, hikeText, m, type HikesLang } from '$lib/js/hikesI18n';

	interface Props {
		hikes: HikeManifestEntry[];
		/** Initial map centre `[lat, lng]`. When provided alongside
		 * `initialZoom`, the map opens with `setView(center, zoom)` instead
		 * of `fitBounds(union)` — used by the index page to align Leaflet's
		 * first paint with the SSR-rendered static overview hero. */
		initialCenter?: [number, number];
		initialZoom?: number;
		/** Fires once the initial (aerial) base layer has finished drawing —
		 * i.e. the map is visually complete. The page uses this to fade out
		 * the SSR-rendered static hero. */
		onReady?: () => void;
	}

	const { hikes, initialCenter, initialZoom, onReady }: Props = $props();
	const lang = $derived((page.data.lang as HikesLang | undefined) ?? 'de');
	const t = $derived(m[lang]);

	// When every displayed hike is in a swisstopo region (CH/LI), the schematic
	// can use swisstopo's z19; with a hike abroad the global fallback is shallower
	// so we cap a touch lower (still generous — the overview is a finder).
	const allSwiss = $derived(hikes.every((h) => isSwissRegion(h.canton, h.country)));

	const schematicMaxZoom = $derived(allSwiss ? 19 : 18);
	const LAYERS: BaseLayer[] = ['schematic', 'aerial', 'dufour'];

	let baseLayer = $state<BaseLayer>('aerial');
	let enableUserLocation = $state(false);
	let locationError = $state<string | null>(null);
	// Re-fit callback wired up once Leaflet + bounds are alive inside the
	// attachment. Null hides the button.
	let recenterMap = $state<(() => void) | null>(null);

	const mapAttachment: Attachment<HTMLElement> = (node) => {
		let cancelled = false;
		let cleanup: (() => void) | undefined;

		(async () => {
			const L = await import('leaflet');
			if (cancelled || !node.isConnected) return;

			// `tolerance` widens the canvas renderer's hit-test radius around
			// every polyline (hit = weight/2 + tolerance), so a route can be
			// hovered/clicked from a comfortable margin instead of demanding a
			// pixel-perfect click on the 4 px line.
			const map = L.map(node, {
				// On-map attribution control removed for a cleaner frame.
				// NOTE: swisstopo's tile licence requires their credit to appear;
				// the /hikes page currently shows no other swisstopo attribution.
				attributionControl: false,
				zoomControl: true,
				preferCanvas: true,
				renderer: L.canvas({ tolerance: 12 })
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

			// First-paint handover: `onReady` fires once the aerial layer
			// has drawn so the static hero can fade out. The map already
			// opened at the static pose via setView (see the initialCenter
			// branch above), so no extra animation is needed — and
			// `flyToBounds(union)` here used to cause a visible wobble on
			// hikes whose union bbox sits at an integer-zoom boundary,
			// where the static's fit and Leaflet's runtime fit disagree by
			// one zoom step. Mirrors the same fix in `HikeMap.svelte`.
			const tileLayers = makeBaseLayers(L, {
				schematicMaxZoom,
				onAerialReady: () => onReady?.()
			});
			// The static hero only matches the starting layer; once the
			// reader picks another, drop it rather than wait for the aerial
			// map to finish a frame it may never draw.
			const switchBaseLayer = baseLayerSwitcher(map, tileLayers, 'aerial', {
				onSwitch: () => onReady?.(),
				maxZoom: (layer) => baseLayerMaxZoom(layer, schematicMaxZoom)
			});

			// Forward-declared so the tile-load handover handler below can
			// close over it; populated once the polyline loop has built the
			// union bounds.
			let initialBounds: ReturnType<typeof L.latLngBounds> | null = null;


			// One polyline per hike, sourced from the manifest's already-
			// simplified previewPolyline (≤40 points each). The layer is
			// re-populated on every `hikes` prop change (see the $effect
			// below) so toggling filters updates the visible routes — and
			// re-fits the camera to the new union bounds.
			//
			// Those 40 points are all the overview needs, but they visibly cut
			// corners once you zoom in on a single valley. From `DETAIL_ZOOM`
			// up, every route currently on screen therefore swaps its coarse
			// line for the hike's full `track.<hash>.json` — the same static
			// file the detail page loads, so it is usually already in the HTTP
			// cache — and swaps back when it leaves the screen or the reader
			// zooms out. See `syncDetail` below.
			const layer = L.layerGroup().addTo(map);

			const DETAIL_ZOOM = 12;
			/** Same threshold `build-hikes` uses for `previewBreaks`: a jump this
			 * long is an overnight transfer, not a walked metre. */
			const GAP_BREAK_KM = 1;
			/** Full tracks already fetched, split into drawable runs. */
			const detailBySlug = new Map<string, [number, number][][]>();
			/** The manifest line for each drawn hike, to swap back to. */
			const coarseBySlug = new Map<string, [number, number][] | [number, number][][]>();
			const polyBySlug = new Map<string, ReturnType<typeof L.polyline>>();
			const detailApplied = new Set<string>();
			const detailLoading = new Set<string>();
			// Cancels in-flight track fetches when the map goes away.
			const detailAbort = new AbortController();

			function gapKm(a: [number, number], b: [number, number]): number {
				const R = 6371;
				const dLat = ((b[0] - a[0]) * Math.PI) / 180;
				const dLng = ((b[1] - a[1]) * Math.PI) / 180;
				const lat1 = (a[0] * Math.PI) / 180;
				const lat2 = (b[0] * Math.PI) / 180;
				const h =
					Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
				return 2 * R * Math.asin(Math.sqrt(h));
			}

			/** Split a full track at the transfer gaps, mirroring `previewBreaks`
			 * so a multi-day hike doesn't gain a straight line across the valley
			 * the moment it renders in detail. */
			function splitRuns(points: [number, number][]): [number, number][][] {
				const runs: [number, number][][] = [];
				let run: [number, number][] = [];
				for (let i = 0; i < points.length; i++) {
					if (i > 0 && gapKm(points[i - 1], points[i]) > GAP_BREAK_KM) {
						if (run.length >= 2) runs.push(run);
						run = [];
					}
					run.push(points[i]);
				}
				if (run.length >= 2) runs.push(run);
				return runs;
			}

			async function loadDetail(hike: HikeManifestEntry) {
				if (detailBySlug.has(hike.slug) || detailLoading.has(hike.slug)) return;
				detailLoading.add(hike.slug);
				try {
					const res = await fetch(hike.trackUrl, { signal: detailAbort.signal });
					if (!res.ok) return;
					// Compact tuple format: [lng, lat, ele, timestamp].
					const tuples = (await res.json()) as [number, number, number | null, number][];
					const points = tuples.map(([lng, lat]) => [lat, lng] as [number, number]);
					if (points.length < 2) return;
					detailBySlug.set(hike.slug, splitRuns(points));
					syncDetail();
				} catch {
					// Aborted, offline or a bad response — the coarse line stays,
					// which is a perfectly usable map.
				} finally {
					detailLoading.delete(hike.slug);
				}
			}

			/** Upgrade every on-screen route to its full track once we're zoomed
			 * in, and downgrade the rest so the canvas never holds more detail
			 * than is being looked at. */
			function syncDetail() {
				const zoomedIn = map.getZoom() >= DETAIL_ZOOM;
				// Padded so a route entering the viewport is already detailed.
				const view = map.getBounds().pad(0.3);
				for (const hike of hikes) {
					const poly = polyBySlug.get(hike.slug);
					if (!poly) continue;
					const [minLat, minLng, maxLat, maxLng] = hike.bbox;
					const onScreen =
						zoomedIn && view.intersects(L.latLngBounds([minLat, minLng], [maxLat, maxLng]));
					if (onScreen) {
						const detail = detailBySlug.get(hike.slug);
						if (!detail) {
							loadDetail(hike);
						} else if (!detailApplied.has(hike.slug)) {
							poly.setLatLngs(detail);
							detailApplied.add(hike.slug);
						}
					} else if (detailApplied.has(hike.slug)) {
						const coarse = coarseBySlug.get(hike.slug);
						if (coarse) poly.setLatLngs(coarse);
						detailApplied.delete(hike.slug);
					}
				}
			}

			function renderPolylines(): boolean {
				layer.clearLayers();
				// The polylines these referred to are gone with the layer.
				polyBySlug.clear();
				coarseBySlug.clear();
				detailApplied.clear();
				const b = L.latLngBounds([]);
				for (const hike of hikes) {
					if (!hike.previewPolyline || hike.previewPolyline.length < 2) continue;
					const latLngs = hike.previewPolyline.map(([lat, lng]) => [lat, lng] as [number, number]);
					const color = sacTrailColor(hike.difficulty);
					// Multi-day hikes with a big inter-stage gap ship `previewBreaks`
					// (indices where a new run starts); split there so Leaflet draws
					// disconnected segments instead of a line across the transfer.
					const breaks = hike.previewBreaks;
					let coords: [number, number][] | [number, number][][] = latLngs;
					if (breaks && breaks.length > 0) {
						const segs: [number, number][][] = [];
						let start = 0;
						for (const brk of breaks) {
							if (brk > start) segs.push(latLngs.slice(start, brk));
							start = brk;
						}
						segs.push(latLngs.slice(start));
						coords = segs.filter((s) => s.length >= 2);
					}
					const poly = L.polyline(coords, {
						color,
						weight: 4,
						opacity: 0.9,
						interactive: true
					}).addTo(layer);

					poly.bindTooltip(
						`<strong>${hikeText(hike, lang).title}</strong><br>` +
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
						goto(resolve('/[hikesLang=hikesLang]/[slug]', { hikesLang: hikesSlugFromLang(lang), slug: hike.slug }));
					});

					polyBySlug.set(hike.slug, poly);
					coarseBySlug.set(hike.slug, coords);

					for (const [lat, lng] of latLngs) {
						b.extend([lat, lng]);
					}
				}
				// A filter change can leave the camera zoomed in on a route that
				// is still (or newly) on screen, so re-apply detail right away.
				syncDetail();
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

			// Detail follows the camera: zooming past DETAIL_ZOOM or panning a
			// route into view pulls its full track, leaving it drops back to the
			// manifest line.
			map.on('zoomend moveend', syncDetail);
			syncDetail();

			// User location (opt-in), followed while the toggle is on.
			let stopUserLocation: (() => void) | undefined;

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

				$effect(() => switchBaseLayer(baseLayer));
				$effect(() => {
					if (!enableUserLocation && stopUserLocation) {
						stopUserLocation();
						stopUserLocation = undefined;
					} else if (enableUserLocation && !stopUserLocation) {
						stopUserLocation = watchUserLocation(L, map);
					}
				});
			});

			cleanup = () => {
				stopUserLocation?.();
				stopReactRoot();
				detailAbort.abort();
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
	<link rel="preconnect" href="https://maps.bocken.org" crossorigin="anonymous" />
</svelte:head>

<div class="map-wrap">
	<div class="overview-map" {@attach mapAttachment} aria-label={t.overview_map_aria}></div>

	<MapControls error={locationError} errorBottom="11rem">
		<LayerMenu layers={LAYERS} bind:value={baseLayer} />

		{#if recenterMap}
			<button
				type="button"
				class="round-btn"
				aria-label={t.recenter_all}
				title={t.recenter_all_title}
				onclick={() => recenterMap?.()}
			>
				<Maximize2 size={18} strokeWidth={2} aria-hidden="true" />
			</button>
		{/if}

		<MapLocateButton bind:enabled={enableUserLocation} bind:error={locationError} />
	</MapControls>
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

	/* Tooltip lives at body level, so it has to be global. Leaflet's own
	 * stylesheet is a <svelte:head> <link>, which the client-side router appends
	 * *after* the app CSS on a soft navigation — so `.leaflet-tooltip` would win
	 * on equal specificity and repaint the bubble white. Qualifying every rule
	 * with `.leaflet-tooltip*` makes it specific enough to win either order. */
	:global(.leaflet-tooltip.hike-overview-tooltip) {
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

	:global(.leaflet-tooltip.hike-overview-tooltip strong) {
		display: block;
		margin-bottom: 0.1rem;
		color: var(--color-text-primary);
	}

	/* The little arrow is a bordered pseudo-element, hardcoded to #fff upstream. */
	:global(.leaflet-tooltip-top.hike-overview-tooltip::before) {
		border-top-color: var(--color-surface);
	}

	:global(.leaflet-tooltip-bottom.hike-overview-tooltip::before) {
		border-bottom-color: var(--color-surface);
	}

	:global(.leaflet-tooltip-left.hike-overview-tooltip::before) {
		border-left-color: var(--color-surface);
	}

	:global(.leaflet-tooltip-right.hike-overview-tooltip::before) {
		border-right-color: var(--color-surface);
	}

	:global(.leaflet-interactive) {
		cursor: pointer;
	}

</style>

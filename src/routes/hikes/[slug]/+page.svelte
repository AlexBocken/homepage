<script lang="ts">
	import HikeMap from '$lib/components/hikes/HikeMap.svelte';
	import HikePhotoStrip from '$lib/components/hikes/HikePhotoStrip.svelte';
	import ElevationProfile from '$lib/components/hikes/ElevationProfile.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { setHikeContext } from '$lib/components/hikes/hikeContext.svelte';
	import { listScrollAnchors } from '$lib/components/hikes/scrollAnchors';
	import { setHover, clearHover } from '$lib/components/hikes/hoverStore.svelte';
	import { focused, setFocused } from '$lib/components/hikes/focusedImageStore.svelte';
	import Route from '@lucide/svelte/icons/route';
	import Clock from '@lucide/svelte/icons/clock';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line';
	import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import Download from '@lucide/svelte/icons/download';
	import { buildGpx, type GpxWritePoint } from '$lib/gpx';
	import { resolveCanton } from '$lib/data/cantons';
	import { sacTrailColor } from '$lib/data/sacColors';
	import type { HikeTrackPoint } from '$types/hikes';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const { hike } = data;
	const MdxComponent = $derived(data.MdxComponent as unknown as typeof import('svelte').SvelteComponent);
	const showPrivate = $derived(!!data.session?.user);

	let track = $state<HikeTrackPoint[] | null>(null);
	let trackError = $state<string | null>(null);
	// Toggled true once Leaflet's first tile batch paints. Drives the
	// fade-out of the SSR-rendered static hero so the static→interactive
	// handover is a soft cross-fade rather than a swap.
	let heroMapReady = $state(false);

	// Phone vs. desktop viewport — picks which pre-rendered pose we hand
	// to Leaflet's first `setView` so it lands aligned with the static
	// `<img>` the CSS is showing. Starts `false` for SSR; the $effect snaps
	// it to the real value on mount and keeps it in sync across rotate /
	// resize. See `/hikes/+page.svelte` for the matching overview-side
	// pattern.
	let narrowViewport = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(max-width: 560px)');
		narrowViewport = mq.matches;
		const onChange = (e: MediaQueryListEvent) => {
			narrowViewport = e.matches;
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	const canton = $derived(resolveCanton(hike.canton));
	const trackColor = $derived(sacTrailColor(hike.difficulty));

	// Publish date formatted in long German for the meta footer
	// (matches the hike's `date: YYYY-MM-DD` frontmatter format).
	const publishedLabel = $derived.by(() => {
		const t = Date.parse(hike.date);
		if (!Number.isFinite(t)) return null;
		return new Date(t).toLocaleDateString('de-CH', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	});

	const heroPose = $derived.by(() => {
		if (
			narrowViewport &&
			hike.heroMapCenterNarrow &&
			typeof hike.heroMapZoomNarrow === 'number'
		) {
			return { center: hike.heroMapCenterNarrow, zoom: hike.heroMapZoomNarrow };
		}
		if (hike.heroMapCenter && typeof hike.heroMapZoom === 'number') {
			return { center: hike.heroMapCenter, zoom: hike.heroMapZoom };
		}
		return null;
	});

	$effect(() => {
		let aborted = false;
		fetch(hike.trackUrl)
			.then((r) => {
				if (!r.ok) throw new Error(`Track fetch failed: ${r.status}`);
				return r.json() as Promise<HikeTrackPoint[]>;
			})
			.then((data) => {
				if (!aborted) track = data;
			})
			.catch((err: Error) => {
				if (!aborted) trackError = err.message;
			});
		return () => {
			aborted = true;
		};
	});

	const durationLabel = $derived(
		hike.durationMin !== null && hike.durationMin > 0
			? `${Math.floor(hike.durationMin / 60)}h ${hike.durationMin % 60}m`
			: '—'
	);

	// Map SAC tier to the painted-rectangle trail-marker colour scheme used
	// in Switzerland: T1 = yellow Wanderweg, T2/T3 = white-red-white
	// Bergwanderweg, T4–T6 = white-blue-white Alpinwanderweg.
	const sacBand = $derived.by<'yellow' | 'red' | 'blue'>(() => {
		if (hike.difficulty === 'T1') return 'yellow';
		if (hike.difficulty === 'T2' || hike.difficulty === 'T3') return 'red';
		return 'blue';
	});

	const MONTHS_DE_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
	const seasonLabel = $derived.by(() => {
		const a = hike.seasonStart;
		const b = hike.seasonEnd;
		if (a == null || b == null) return null;
		if (a < 1 || a > 12 || b < 1 || b > 12) return null;
		return `${MONTHS_DE_SHORT[a - 1]}–${MONTHS_DE_SHORT[b - 1]}`;
	});

	// Filter visibility once at the page level so the map and the photo strip
	// operate on the same index space — focused indexes are positions in this
	// shared array.
	const visibleImagePoints = $derived(
		showPrivate
			? hike.imagePoints
			: hike.imagePoints.filter((ip) => ip.visibility !== 'private')
	);

	// Expose both the full chronological list and the visibility-filtered
	// list to `<HikeImage>` instances embedded in the MDX body. The track
	// is exposed too so each HikeImage can resolve its timestamp to a
	// track index for the scroll-progress pin.
	setHikeContext(() => ({
		images: hike.imagePoints,
		visibleImages: visibleImagePoints,
		track
	}));

	// Continuous trail-position tracking. As the reader scrolls through the
	// content column, we sample every registered `<HikeImage>` anchor's
	// viewport position and linearly interpolate between adjacent images'
	// track indices using the viewport's vertical midpoint as the cursor.
	// The result is pushed into the hover store, so the sticky map's pin
	// glides along the trail just like it does for chart hovers.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(min-width: 1024px)');
		if (!mq.matches) return;

		let frame: number | null = null;
		let lastHoverIdx = -1;
		let lastFocusIdx: number | null = null;

		function sample(): void {
			frame = null;
			const anchors = listScrollAnchors();
			if (anchors.length === 0) return;
			// Sort by current viewport-top — that's the natural reading order
			// even if a couple of images were rendered out of chronological
			// sequence in the prose.
			const sorted = anchors
				.map((a) => ({
					top: a.element.getBoundingClientRect().top,
					trackIdx: a.trackIdx,
					visibleIdx: a.visibleIdx
				}))
				.sort((a, b) => a.top - b.top);

			const anchorY = window.innerHeight / 2;
			let trackIdx: number;
			let visibleIdx: number;

			if (anchorY <= sorted[0].top) {
				trackIdx = sorted[0].trackIdx;
				visibleIdx = sorted[0].visibleIdx;
			} else if (anchorY >= sorted[sorted.length - 1].top) {
				const last = sorted[sorted.length - 1];
				trackIdx = last.trackIdx;
				visibleIdx = last.visibleIdx;
			} else {
				// Find the bracketing pair and interpolate.
				let lo = sorted[0];
				let hi = sorted[sorted.length - 1];
				for (let i = 0; i < sorted.length - 1; i++) {
					if (anchorY >= sorted[i].top && anchorY < sorted[i + 1].top) {
						lo = sorted[i];
						hi = sorted[i + 1];
						break;
					}
				}
				const span = hi.top - lo.top || 1;
				const frac = (anchorY - lo.top) / span;
				trackIdx = Math.round(lo.trackIdx + frac * (hi.trackIdx - lo.trackIdx));
				// "Nearest" image — whichever bracket endpoint we're closer to.
				visibleIdx = frac < 0.5 ? lo.visibleIdx : hi.visibleIdx;
			}

			if (trackIdx !== lastHoverIdx) {
				lastHoverIdx = trackIdx;
				setHover(trackIdx, 'scroll');
			}
			if (visibleIdx !== lastFocusIdx && focused.source !== 'strip' && focused.source !== 'map') {
				lastFocusIdx = visibleIdx;
				setFocused(visibleIdx, 'inline');
			}
		}

		function onScroll(): void {
			if (frame !== null) return;
			frame = requestAnimationFrame(sample);
		}

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		// One initial sample so the pin sits at the right place on page load.
		onScroll();

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			if (frame !== null) cancelAnimationFrame(frame);
			// Clear the scroll-driven hover so the pin disappears if the user
			// navigates away from the page.
			clearHover();
		};
	});

	// Client-side GPX export of just the track (no image waypoints). Built
	// from the already-loaded JSON track so we don't hit the network again.
	function downloadGpx(): void {
		if (!track || track.length === 0) return;
		const points: GpxWritePoint[] = track.map(([lng, lat, ele, t]) => ({
			lat,
			lng,
			altitude: typeof ele === 'number' ? ele : undefined,
			timestamp: typeof t === 'number' ? t : null
		}));
		const gpx = buildGpx({ name: hike.title, trackPoints: points });
		const blob = new Blob([gpx], { type: 'application/gpx+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${hike.slug}.gpx`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<Seo
	title={`${hike.title} · Wanderungen`}
	description={hike.summary}
	ogType="article"
	ogImage={hike.cover.src || undefined}
	ogImageAlt={hike.cover.alt || undefined}
	lang="de"
/>

<svelte:head>
	<link
		rel="preload"
		as="fetch"
		href={hike.trackUrl}
		type="application/json"
		crossorigin="anonymous"
	/>
	<link rel="preconnect" href="https://wmts.geo.admin.ch" crossorigin="anonymous" />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<article class="hike-detail">
	<!-- The map IS the hero: the trail is the most informative thing about a
	     hike, so we lead with it. Title overlays at the bottom-left. A second
	     HikeMap further down sticks in the scroll-area; both share state via
	     the focusedImageStore so they animate together. -->
	<section class="hero-map" style="view-transition-name: hike-{hike.slug}">
		{#if hike.heroMapUrlLight}
			<!-- Build-time static composite of Swisstopo tiles + the trail
			     polyline + public photo markers. Four variants ship — theme
			     (light/dark) × viewport (wide/narrow). Theme is picked by
			     `data-theme` / `prefers-color-scheme`; viewport by a
			     `max-width: 560px` media query. Each variant is rendered at
			     the same pose Leaflet's `fitBounds` picks for its target
			     container size, so the static→live cross-fade aligns
			     pixel-perfectly. The image fades out once Leaflet's first
			     tile batch loads. -->
			<img
				class="hero-static hero-static-light hero-static-wide"
				class:faded={heroMapReady}
				src={hike.heroMapUrlLight}
				alt=""
				aria-hidden="true"
				loading="eager"
				decoding="async"
			/>
		{/if}
		{#if hike.heroMapUrlDark}
			<img
				class="hero-static hero-static-dark hero-static-wide"
				class:faded={heroMapReady}
				src={hike.heroMapUrlDark}
				alt=""
				aria-hidden="true"
				loading="eager"
				decoding="async"
			/>
		{/if}
		{#if hike.heroMapUrlLightNarrow}
			<img
				class="hero-static hero-static-light hero-static-narrow"
				class:faded={heroMapReady}
				src={hike.heroMapUrlLightNarrow}
				alt=""
				aria-hidden="true"
				loading="eager"
				decoding="async"
			/>
		{/if}
		{#if hike.heroMapUrlDarkNarrow}
			<img
				class="hero-static hero-static-dark hero-static-narrow"
				class:faded={heroMapReady}
				src={hike.heroMapUrlDarkNarrow}
				alt=""
				aria-hidden="true"
				loading="eager"
				decoding="async"
			/>
		{/if}
		{#if track && track.length > 0}
			<HikeMap
				{track}
				imagePoints={visibleImagePoints}
				showPrivate
				{trackColor}
				initialCenter={heroPose?.center}
				initialZoom={heroPose?.zoom}
				onReady={() => (heroMapReady = true)}
			/>
		{:else if trackError}
			<div class="map-fallback">Track konnte nicht geladen werden: {trackError}</div>
		{:else if !hike.heroMapUrlLight}
			<div class="map-fallback">Track wird geladen…</div>
		{/if}
		<div class="hero-title">
			<h1>{hike.title}</h1>
			{#if hike.region}
				<p class="region">
					{#if canton}
						<img
							class="canton-emblem"
							src={canton.emblemUrl}
							alt=""
							aria-hidden="true"
							loading="eager"
							decoding="async"
						/>
					{/if}
					<span class="region-text">
						{hike.region}{hike.canton && hike.canton !== hike.region
							? `, ${hike.canton}`
							: ''}
					</span>
				</p>
			{/if}
		</div>
	</section>

	{#if track && track.length > 0 && visibleImagePoints.length > 0}
		<section class="strip-area">
			<HikePhotoStrip images={visibleImagePoints} {track} />
		</section>
	{/if}

	<section class="metrics" aria-label="Tourendaten">
		{#if hike.icon}
			<img class="route-icon" src={hike.icon} alt="" aria-hidden="true" />
		{/if}
		<div class="metric">
			<Route size={20} strokeWidth={1.75} aria-hidden="true" />
			<span class="value">{hike.distanceKm.toFixed(1)}<span class="value-unit">km</span></span>
			<span class="unit">Distanz</span>
		</div>
		<div class="metric">
			<Clock size={20} strokeWidth={1.75} aria-hidden="true" />
			<span class="value">{durationLabel}</span>
			<span class="unit">Dauer</span>
		</div>
		<div class="metric">
			<TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" />
			<span class="value">{hike.elevationGainM}<span class="value-unit">m</span></span>
			<span class="unit">Aufstieg</span>
		</div>
		<div class="metric">
			<TrendingDown size={20} strokeWidth={1.75} aria-hidden="true" />
			<span class="value">{hike.elevationLossM}<span class="value-unit">m</span></span>
			<span class="unit">Abstieg</span>
		</div>
		{#if hike.elevationMaxM !== null}
			<div class="metric">
				<ArrowUpToLine size={20} strokeWidth={1.75} aria-hidden="true" />
				<span class="value">{hike.elevationMaxM}<span class="value-unit">m</span></span>
				<span class="unit">höchster</span>
			</div>
		{/if}
		{#if hike.elevationMinM !== null}
			<div class="metric">
				<ArrowDownToLine size={20} strokeWidth={1.75} aria-hidden="true" />
				<span class="value">{hike.elevationMinM}<span class="value-unit">m</span></span>
				<span class="unit">tiefster</span>
			</div>
		{/if}
		<div class="metric">
			<span class="sac-marker sac-marker-{sacBand}" aria-hidden="true"></span>
			<span class="value">{hike.difficulty}</span>
			<span class="unit">SAC</span>
		</div>
		{#if seasonLabel}
			<div class="metric">
				<CalendarRange size={20} strokeWidth={1.75} aria-hidden="true" />
				<span class="value">{seasonLabel}</span>
				<span class="unit">Saison</span>
			</div>
		{/if}
	</section>

	{#if hike.tags.length > 0}
		<!-- Tag chips sit between the metric tiles (facts) and the
		     elevation profile (data viz) so they read as framing context —
		     "what kind of hike is this" — before the data takes over.
		     Each chip is an anchor link to the /hikes overview with that
		     tag pre-selected in the filter bar. -->
		<section class="tags" aria-label="Schlagwörter">
			{#each hike.tags as tag (tag)}
				<a class="tag-chip" href="/hikes?tag={encodeURIComponent(tag)}">
					<span class="tag-hash" aria-hidden="true">#</span>{tag}
				</a>
			{/each}
		</section>
	{/if}

	{#if track && track.length > 0}
		<section class="elev-area">
			<ElevationProfile {track} />
		</section>
	{/if}

	<section class="scroll-area">
		<aside class="trail-col">
			{#if track && track.length > 0}
				<HikeMap {track} imagePoints={visibleImagePoints} showPrivate {trackColor} />
				<ElevationProfile {track} />
			{/if}
		</aside>

		<section class="content-col">
			<MdxComponent />
		</section>
	</section>

	<!-- Quiet meta footer: route metadata + sources + ancillary actions.
	     De-emphasises the GPX download (previously a centred primary
	     button) by grouping it with other "extras" that a small minority
	     of readers care about. -->
	<footer class="meta-footer">
		<button
			type="button"
			class="meta-link"
			onclick={downloadGpx}
			disabled={!track || track.length === 0}
			title="GPX-Datei mit nur dem Track (ohne Bilder) herunterladen"
		>
			<Download size={13} strokeWidth={2} aria-hidden="true" />
			<span>GPX-Track herunterladen</span>
		</button>
		<span class="meta-dot" aria-hidden="true">·</span>
		<span>{hike.pointCount.toLocaleString('de-CH')} Wegpunkte</span>
		{#if publishedLabel}
			<span class="meta-dot" aria-hidden="true">·</span>
			<span>Veröffentlicht {publishedLabel}</span>
		{/if}
		<span class="meta-dot" aria-hidden="true">·</span>
		<span>
			Kartendaten &copy;
			<a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener noreferrer">
				swisstopo
			</a>
		</span>
	</footer>
</article>

<style>
	.hike-detail {
		max-width: 1400px;
		margin-inline: auto;
		padding: 0 0 4rem;
	}

	/* Hero map is full-bleed: breaks out of the centered `.hike-detail`
	 * container to span the entire viewport width and extends *under* the
	 * sticky nav (which is glass-blurred and sits above with z-index). The
	 * `calc(50% - 50vw)` trick stretches a child of a centered parent
	 * edge-to-edge; the negative top margin pulls the map back up over
	 * the gap that the nav's height + top-margin would otherwise leave. */
	.hero-map {
		position: relative;
		width: 100vw;
		/* Reserve the eventual map height up-front so the page doesn't shift
		 * once the track JSON arrives and HikeMap mounts. Same clamp as
		 * `.hero-map :global(.map)` so the container and the leaflet pane
		 * are always congruent. */
		min-height: clamp(360px, 60vh, 640px);
		margin-left: calc(50% - 50vw);
		margin-right: calc(50% - 50vw);
		margin-top: calc(-1 * (3rem + max(12px, env(safe-area-inset-top, 0px) + 4px)));
		margin-bottom: 0;
		overflow: hidden;
		/* Transparent so any tile area not yet painted shows the page
		 * background through — which already adapts to the active theme.
		 * Leaflet's default `#ddd` container background is overridden in
		 * the `.map` rule below. */
		background: transparent;
	}

	.hero-map :global(.map) {
		position: relative;
		z-index: 2;
		height: clamp(360px, 60vh, 640px);
		border-radius: 0;
		box-shadow: none;
		/* Stay transparent so the SSR-rendered static map underneath shows
		 * through until Leaflet's tilepane paints over it. */
		background: transparent;
	}

	/* Static hero map (pre-rendered Swisstopo composite). Displayed at
	 * NATIVE pixel size (`object-fit: none`) and centred — `cover` would
	 * scale the image and break the 1:1 pixel match with Leaflet's tile
	 * rendering, which is what caused the visible shift during cross-
	 * fade. Wider viewports just show a slightly-cropped band of the
	 * full image; the central region (where the trail lives) is always
	 * pixel-aligned with the live map. */
	.hero-static {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: none;
		object-position: center;
		z-index: 1;
		opacity: 1;
		transition: opacity 450ms ease;
	}

	.hero-static.faded {
		opacity: 0;
		/* Once faded the live map is fully in charge; ensure the static
		 * image doesn't intercept hovers/clicks meant for the leaflet
		 * panes underneath. */
		pointer-events: none;
	}

	/* 2×2 picker: theme (light/dark) × viewport (wide/narrow). Each `<img>`
	 * has both qualifiers (e.g. `.hero-static-light.hero-static-wide`); we
	 * hide everything by default and reveal exactly one based on the
	 * active theme and the `max-width: 560px` media query. The narrow
	 * variant uses a phone-sized pose so the auto-fit zoom matches what
	 * Leaflet picks at the same container width. */
	.hero-static { display: none; }

	/* Default (light theme assumed, no `data-theme` attribute, no
	 * `prefers-color-scheme: dark`): show the wide-light variant. */
	.hero-static-light.hero-static-wide { display: block; }
	@media (max-width: 560px) {
		.hero-static-light.hero-static-wide { display: none; }
		.hero-static-light.hero-static-narrow { display: block; }
	}

	@media (prefers-color-scheme: dark) {
		.hero-static-light.hero-static-wide,
		.hero-static-light.hero-static-narrow { display: none; }
		.hero-static-dark.hero-static-wide { display: block; }
		@media (max-width: 560px) {
			.hero-static-dark.hero-static-wide { display: none; }
			.hero-static-dark.hero-static-narrow { display: block; }
		}
	}

	/* Explicit `data-theme` always wins. */
	:global(:root[data-theme='light']) .hero-static-dark { display: none !important; }
	:global(:root[data-theme='light']) .hero-static-light.hero-static-wide { display: block; }
	@media (max-width: 560px) {
		:global(:root[data-theme='light']) .hero-static-light.hero-static-wide { display: none; }
		:global(:root[data-theme='light']) .hero-static-light.hero-static-narrow { display: block; }
	}

	:global(:root[data-theme='dark']) .hero-static-light { display: none !important; }
	:global(:root[data-theme='dark']) .hero-static-dark.hero-static-wide { display: block; }
	@media (max-width: 560px) {
		:global(:root[data-theme='dark']) .hero-static-dark.hero-static-wide { display: none; }
		:global(:root[data-theme='dark']) .hero-static-dark.hero-static-narrow { display: block; }
	}


	/* Push Leaflet's top-left controls (zoom +/-) below the sticky nav so
	 * they aren't covered on narrow viewports where the nav spans the
	 * full width. The bottom-right controls (layer toggle, photo toggle,
	 * GPS) sit clear of the nav already. */
	.hero-map :global(.leaflet-top) {
		top: calc(3rem + max(12px, env(safe-area-inset-top, 0px) + 4px) + 0.5rem);
	}

	.hero-title {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 1.5rem 1.5rem 1.25rem;
		background: linear-gradient(to top, rgb(0 0 0 / 0.6), transparent);
		color: white;
		pointer-events: none;
		z-index: 400;
	}

	.hero-title h1 {
		margin: 0;
		font-size: clamp(1.5rem, 4vw, 2.2rem);
		text-shadow: 0 2px 8px rgb(0 0 0 / 0.45);
	}

	.region {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.2rem 0 0;
		opacity: 0.9;
		text-shadow: 0 1px 4px rgb(0 0 0 / 0.45);
	}

	.canton-emblem {
		flex: 0 0 auto;
		width: 24px;
		height: 30px;
		object-fit: contain;
		/* Drop shadow keeps the emblem readable on the gradient overlay
		 * (which only goes dark from ~50 % down). */
		filter: drop-shadow(0 1px 3px rgb(0 0 0 / 0.5));
	}

	.region-text {
		min-width: 0;
	}

	.metrics {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem 2.25rem;
		padding: 1.5rem 1rem;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.route-icon {
		width: 96px;
		height: 96px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.metric {
		display: grid;
		grid-template-columns: auto auto;
		grid-template-rows: auto auto;
		column-gap: 0.55rem;
		row-gap: 0.05rem;
		align-items: center;
	}

	.metric :global(svg) {
		grid-row: 1 / span 2;
		color: var(--color-primary);
	}

	.metrics .value {
		font-size: 1.35rem;
		line-height: 1.1;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.value-unit {
		font-size: 0.7em;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-left: 0.15em;
	}

	.metrics .unit {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		letter-spacing: 0.02em;
	}

	/* SAC trail-marker pictograms in landscape orientation.
	 * T1: yellow Wegweiser-style sign with a right-pointing arrow tip.
	 * T2/T3: white-red-white painted Bergwanderweg marker.
	 * T4–T6: white-blue-white painted Alpinwanderweg marker. */
	.sac-marker {
		grid-row: 1 / span 2;
		width: 28px;
		height: 20px;
	}

	.sac-marker-yellow {
		width: 32px;
		background: #f5a623;
		/* Pentagon → flat left, arrow point on the right, like a Swiss
		 * hiking-trail Wegweiser. Clip-path overrides any border so the
		 * outline is supplied by filter: drop-shadow instead. */
		clip-path: polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%);
		filter: drop-shadow(0 0 0.5px rgb(0 0 0 / 0.45));
	}

	.sac-marker-red {
		border-radius: 2px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.18);
		background: linear-gradient(
			to bottom,
			#fff 0 25%,
			#dc1d2a 25% 75%,
			#fff 75% 100%
		);
	}

	.sac-marker-blue {
		border-radius: 2px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.18);
		background: linear-gradient(
			to bottom,
			#fff 0 25%,
			#2965c8 25% 75%,
			#fff 75% 100%
		);
	}

	/* Tag chips: muted pills between the metric block and the elevation
	 * chart. Quieter than the metric tiles (lighter bg, no border, no
	 * shadow) so the metric numbers stay the dominant glance-info, and
	 * the tags read as framing context — "what kind of hike". */
	.tags {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem 0.5rem;
		padding: 0 1rem 0.25rem;
	}

	.tag-chip {
		display: inline-flex;
		align-items: baseline;
		gap: 0.15rem;
		padding: 0.25rem 0.7rem;
		font-size: 0.78rem;
		line-height: 1;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		letter-spacing: 0.005em;
		text-decoration: none;
		transition:
			color var(--transition-fast),
			background-color var(--transition-fast),
			scale var(--transition-fast);
	}

	.tag-chip:hover {
		color: var(--color-primary);
		background: var(--color-bg-elevated);
		scale: 1.05;
	}

	.tag-hash {
		color: var(--color-text-tertiary);
		font-weight: 600;
	}

	.tag-chip:hover .tag-hash {
		color: color-mix(in oklab, var(--color-primary) 60%, currentColor);
	}

	.elev-area {
		padding: 0 1rem;
		margin-top: 0.25rem;
	}

	/* Meta footer: small, muted, centred, separated by middots. Groups
	 * the GPX download with other ancillary metadata (waypoint count,
	 * publish date, swisstopo attribution) so it reads as "extras" rather
	 * than a primary CTA. */
	.meta-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.35rem 0.6rem;
		padding: 2rem 1.5rem 0;
		margin-top: 2rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	.meta-footer a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
		text-underline-offset: 0.18em;
		transition: color var(--transition-fast), text-decoration-color var(--transition-fast);
	}

	.meta-footer a:hover {
		color: var(--color-primary);
		text-decoration-color: currentColor;
	}

	.meta-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0;
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
		text-underline-offset: 0.18em;
		transition: color var(--transition-fast), text-decoration-color var(--transition-fast);
	}

	.meta-link:hover:not(:disabled) {
		color: var(--color-primary);
		text-decoration-color: currentColor;
	}

	.meta-link:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		text-decoration: none;
	}

	.meta-link :global(svg) {
		flex: 0 0 auto;
		opacity: 0.7;
	}

	.meta-dot {
		opacity: 0.55;
	}

	.strip-area {
		padding-inline: 1rem;
		margin-top: 0.5rem;
	}

	.scroll-area {
		padding-inline: 1rem;
		margin-top: 1.5rem;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
	}

	/* Mobile: the hero map at the top is the only map; the secondary sticky
	 * map (and the elevation profile that lived next to it) are redundant
	 * since there's no scrollytelling without the two-column layout. */
	.trail-col {
		display: none;
	}

	.trail-col,
	.content-col {
		min-width: 0;
	}

	.content-col {
		font-size: 1rem;
		line-height: 1.65;
	}

	.content-col :global(p) {
		margin: 0 0 1.2rem;
	}

	.content-col :global(h2) {
		margin: 2rem 0 0.75rem;
		font-size: 1.5rem;
		color: var(--color-text-primary);
	}

	.content-col :global(blockquote) {
		margin: 1.5rem 0;
		padding: 0.6rem 1rem;
		border-left: 3px solid var(--color-primary);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	/* Desktop scrollytelling: a sticky trail column on the left holding a
	 * smaller copy of the map + elevation profile, with prose + inline
	 * images flowing on the right. Below 1024 px the columns stack and the
	 * trail loses its stickiness.
	 *
	 * For `position: sticky` to actually engage, the grid item's own height
	 * must be smaller than the row's resolved height — `align-self: start`
	 * stops the grid from stretching the cell to the row's full height
	 * (which would otherwise leave no scroll room for the sticky to move
	 * against). The trail-col contains only the secondary map + elevation
	 * here (the strip lives above, the photos inline), so it stays short. */
	@media (min-width: 1024px) {
		.scroll-area {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 2.5rem;
			align-items: start;
		}

		.trail-col {
			display: block;
			position: sticky;
			/* The global nav is itself sticky (3 rem tall, ~12 px top offset),
			 * so anchor the map below it with a small breathing gap. */
			top: calc(3rem + max(12px, env(safe-area-inset-top, 0px) + 4px) + 0.75rem);
			align-self: start;
		}

		.trail-col :global(.map) {
			height: 400px;
			border-radius: var(--radius-card);
		}

		.trail-col :global(.elevation) {
			height: 180px;
		}
	}

	.map-fallback {
		display: grid;
		place-items: center;
		height: clamp(360px, 60vh, 640px);
		padding: 1rem;
		text-align: center;
		color: var(--color-text-tertiary);
		background: var(--color-bg-elevated);
	}
</style>

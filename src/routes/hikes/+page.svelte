<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import HikeCard from '$lib/components/hikes/HikeCard.svelte';
	import HikesFilterBar, { type HikesFilter } from '$lib/components/hikes/HikesFilterBar.svelte';
	import HikesOverviewMap from '$lib/components/hikes/HikesOverviewMap.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { HIKES_OVERVIEW } from '$lib/data/hikes.generated';
	import { hikeFilterBounds } from '$lib/hikes/filterBounds';
	import { resolveHikeArea } from '$lib/hikes/hikeArea';
	import type { Difficulty } from '$types/hikes';

	// True when the current month falls inside the hike's recommended season
	// window. Windows can wrap the new year (start > end, e.g. 11–3 for winter);
	// a missing/invalid window counts as year-round (always in season).
	function isInSeason(start: number | null | undefined, end: number | null | undefined, month: number): boolean {
		if (start == null || end == null) return true;
		if (start < 1 || start > 12 || end < 1 || end > 12) return true;
		return start <= end ? month >= start && month <= end : month >= start || month <= end;
	}
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	// Fades the SSR-rendered static overview hero out once Leaflet's first
	// schematic-tile batch has loaded. Same handover pattern as the detail
	// page's hero map.
	let heroMapReady = $state(false);

	// Three-band viewport switch — drives which pre-rendered pose
	// (`HIKES_OVERVIEW.zoom/center` vs. `.zoomMedium/.centerMedium` vs.
	// `.zoomNarrow/.centerNarrow`) we hand to Leaflet's first `setView` so
	// it lands aligned with whichever static `<img>` the CSS is showing.
	// Starts `false`/`false` to match SSR (which has no window); the
	// $effect snaps to the real value on mount and keeps both flags in
	// sync across rotate/resize. `narrow` wins over `medium` when both
	// would match (≤560 is also <900).
	let narrowViewport = $state(false);
	let mediumViewport = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mqNarrow = window.matchMedia('(max-width: 560px)');
		const mqMedium = window.matchMedia('(min-width: 561px) and (max-width: 899px)');
		narrowViewport = mqNarrow.matches;
		mediumViewport = mqMedium.matches;
		const onNarrow = (e: MediaQueryListEvent) => { narrowViewport = e.matches; };
		const onMedium = (e: MediaQueryListEvent) => { mediumViewport = e.matches; };
		mqNarrow.addEventListener('change', onNarrow);
		mqMedium.addEventListener('change', onMedium);
		return () => {
			mqNarrow.removeEventListener('change', onNarrow);
			mqMedium.removeEventListener('change', onMedium);
		};
	});

	const overviewPose = $derived.by(() => {
		if (!HIKES_OVERVIEW) return null;
		if (narrowViewport && HIKES_OVERVIEW.urlNarrow && HIKES_OVERVIEW.centerNarrow && typeof HIKES_OVERVIEW.zoomNarrow === 'number') {
			return { center: HIKES_OVERVIEW.centerNarrow, zoom: HIKES_OVERVIEW.zoomNarrow };
		}
		if (mediumViewport && HIKES_OVERVIEW.urlMedium && HIKES_OVERVIEW.centerMedium && typeof HIKES_OVERVIEW.zoomMedium === 'number') {
			return { center: HIKES_OVERVIEW.centerMedium, zoom: HIKES_OVERVIEW.zoomMedium };
		}
		return { center: HIKES_OVERVIEW.center, zoom: HIKES_OVERVIEW.zoom };
	});

	// Filter ceilings start wide-open so the initial render (SSR + first
	// hydration pass) shows every hike. `$effect` below clamps them down
	// to the actual data maxes once `data.hikes` is fully populated —
	// reading `data.hikes` synchronously at script-init turned out to be
	// fragile during dev hydration (it sporadically returned a one-hike
	// subset, which then locked the filter to that one hike until the
	// next navigation cycle).
	const filter = $state<HikesFilter>({
		minDistanceKm: Number.NEGATIVE_INFINITY,
		maxDistanceKm: Number.POSITIVE_INFINITY,
		minDurationMin: Number.NEGATIVE_INFINITY,
		maxDurationMin: Number.POSITIVE_INFINITY,
		minGainM: Number.NEGATIVE_INFINITY,
		maxGainM: Number.POSITIVE_INFINITY,
		minLossM: Number.NEGATIVE_INFINITY,
		maxLossM: Number.POSITIVE_INFINITY,
		difficulties: new SvelteSet<Difficulty>(),
		regions: new SvelteSet<string>(),
		areas: new SvelteSet<string>(),
		tags: new SvelteSet<string>(),
		inSeasonOnly: false
	});

	// Tag deep-link: arrival from a detail-page tag chip (`/hikes?tag=winter`)
	// or any saved URL with `?tag=...` pre-selects those tags. Runs once on
	// mount; thereafter the URL writer below is the source of truth.
	let initialTagsApplied = false;
	$effect(() => {
		if (initialTagsApplied) return;
		if (typeof window === 'undefined') return;
		const params = page.url.searchParams.getAll('tag');
		for (const t of params) if (t) filter.tags.add(t);
		initialTagsApplied = true;
	});

	// Tag URL sync: every toggle in the filter bar reflects into the URL
	// so the page is shareable / back-button-restorable. `replaceState`
	// rather than `goto` keeps history clean — toggling four tags would
	// otherwise leave four back-button stops.
	$effect(() => {
		if (typeof window === 'undefined' || !initialTagsApplied) return;
		const url = new URL(window.location.href);
		const wanted = [...filter.tags].sort();
		const current = url.searchParams.getAll('tag').slice().sort();
		// Skip the no-op rewrite path — `replaceState` would still touch
		// history's state object and trigger downstream `page.url` effects
		// for no UX benefit.
		if (
			wanted.length === current.length &&
			wanted.every((t, i) => t === current[i])
		) return;
		url.searchParams.delete('tag');
		for (const t of wanted) url.searchParams.append('tag', t);
		replaceState(url, page.state);
	});

	// One-shot per mount: set the slider ceilings to the actual data maxes.
	// Runs once after `data.hikes` is non-empty; the inner reads of every
	// `distanceKm`/`durationMin`/etc. fall under the same effect so a
	// subsequent data-only update would also refresh the defaults — but for
	// this prerendered, static-data page that's effectively a no-op.
	let filterDefaultsApplied = false;
	$effect(() => {
		if (filterDefaultsApplied) return;
		if (data.hikes.length === 0) return;
		const b = hikeFilterBounds(data.hikes);
		filter.minDistanceKm = b.distance.min;
		filter.maxDistanceKm = b.distance.max;
		filter.minDurationMin = b.duration.min;
		filter.maxDurationMin = b.duration.max;
		filter.minGainM = b.gain.min;
		filter.maxGainM = b.gain.max;
		filter.minLossM = b.loss.min;
		filter.maxLossM = b.loss.max;
		filterDefaultsApplied = true;
	});

	const visible = $derived.by(() => {
		const out = [];
		const currentMonth = new Date().getMonth() + 1;
		for (const h of data.hikes) {
			if (h.distanceKm < filter.minDistanceKm || h.distanceKm > filter.maxDistanceKm) continue;
			const dur = h.durationMin ?? 0;
			if (dur < filter.minDurationMin || dur > filter.maxDurationMin) continue;
			if (h.elevationGainM < filter.minGainM || h.elevationGainM > filter.maxGainM) continue;
			if (h.elevationLossM < filter.minLossM || h.elevationLossM > filter.maxLossM) continue;
			if (filter.difficulties.size > 0 && !filter.difficulties.has(h.difficulty)) continue;
			if (filter.regions.size > 0 && (!h.region || !filter.regions.has(h.region))) continue;
			if (filter.areas.size > 0) {
				const area = resolveHikeArea(h.canton, h.country);
				if (!area || !filter.areas.has(area.value)) continue;
			}
			if (filter.inSeasonOnly && !isInSeason(h.seasonStart, h.seasonEnd, currentMonth)) continue;
			// Multi-tag = OR (a hike matching ANY selected tag is shown). AND
			// would shrink the listing to ~zero quickly given how few tags
			// most hikes have; OR matches how detail-page chips feel like
			// "show me more like this".
			if (filter.tags.size > 0) {
				let any = false;
				for (const t of h.tags) {
					if (filter.tags.has(t)) { any = true; break; }
				}
				if (!any) continue;
			}
			out.push(h);
		}
		return out;
	});

	// Lightweight totals strip over the currently-filtered subset — gives
	// the user a sense of what they're looking at without having to scan
	// every card.
	const totals = $derived.by(() => {
		let km = 0;
		let gain = 0;
		for (const h of visible) {
			km += h.distanceKm;
			gain += h.elevationGainM;
		}
		return {
			km: Math.round(km),
			gain: Math.round(gain)
		};
	});
</script>

<Seo
	title="Wanderungen"
	description="Wanderberichte mit interaktiver Karte, Höhenprofil und GPX-Track."
	lang="de"
/>

<section class="hikes-page">
	<section class="hero-map" aria-label="Übersicht">
		{#if HIKES_OVERVIEW}
			<!-- Build-time static composite of Swisstopo tiles + every
			     visible hike's preview polyline, coloured by SAC tier.
			     Displayed at native pixel size (`object-fit: none`) so it
			     overlays Leaflet's live tiles exactly. The image fades out
			     once Leaflet's first tile batch loads. Three width variants
			     ship — wide (≥900 CSS px), medium (561–899), narrow (≤560).
			     CSS chooses which one shows based on a media query so
			     hydration doesn't need to wait. -->
			<img
				class="hero-static hero-static-wide"
				class:faded={heroMapReady}
				src={HIKES_OVERVIEW.url}
				alt=""
				aria-hidden="true"
				loading="eager"
				decoding="async"
			/>
			{#if HIKES_OVERVIEW.urlMedium}
				<img
					class="hero-static hero-static-medium"
					class:faded={heroMapReady}
					src={HIKES_OVERVIEW.urlMedium}
					alt=""
					aria-hidden="true"
					loading="eager"
					decoding="async"
				/>
			{/if}
			{#if HIKES_OVERVIEW.urlNarrow}
				<img
					class="hero-static hero-static-narrow"
					class:faded={heroMapReady}
					src={HIKES_OVERVIEW.urlNarrow}
					alt=""
					aria-hidden="true"
					loading="eager"
					decoding="async"
				/>
			{/if}
		{/if}
		<HikesOverviewMap
			hikes={visible}
			initialCenter={overviewPose?.center}
			initialZoom={overviewPose?.zoom}
			onReady={() => (heroMapReady = true)}
		/>
	</section>

	<div class="below-hero">
		<!-- Wrapped in a named view-transition box so the filter bar can fly
		     up alongside the cards when arriving at /hikes from outside the
		     hikes group. Same `view-transition-class: hike-fly-in` as each
		     HikeCard so one CSS rule animates both. -->
		<div class="filter-vt-box">
			<HikesFilterBar
				hikes={data.hikes}
				{filter}
				resultCount={visible.length}
				totalCount={data.hikes.length}
				totalKm={totals.km}
				totalGain={totals.gain}
			/>
		</div>

		{#if visible.length === 0}
			<p class="empty">Keine Wanderung entspricht den aktuellen Filtern.</p>
		{:else}
			<ul class="grid">
				{#each visible as hike (hike.slug)}
					<li>
						<HikeCard {hike} />
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Tiny swisstopo credit. The map's own attribution control is hidden
		     for a cleaner frame, but their tile licence still requires the
		     credit to appear somewhere on the page. -->
		<footer class="map-credit">
			Kartendaten &copy;
			<a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener noreferrer">swisstopo</a>
			·
			<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>,
			<a href="https://opentopomap.org/" target="_blank" rel="noopener noreferrer">OpenTopoMap</a>
			·
			<a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>
		</footer>
	</div>
</section>

<style>
	.hikes-page {
		max-width: 1200px;
		margin-inline: auto;
		padding: 0 0 3rem;
	}

	/* Full-bleed hero, matching the detail-page hero: edge-to-edge via
	 * `calc(50% - 50vw)` and pulled up under the glass-blurred sticky nav
	 * with a negative top margin equal to the nav's height.
	 * `isolation: isolate` creates a stacking context so Leaflet's
	 * z-index:200+ panes can't escape this section and render over the
	 * sticky nav (which sits at z-index 100). The detail-page hero gets
	 * this same effect for free because it sets `view-transition-name`. */
	.hero-map {
		position: relative;
		isolation: isolate;
		width: 100vw;
		/* Reserve the eventual map height up-front so the static image and
		 * Leaflet's tile pane sit on a stable surface (no scroll-shift when
		 * either mounts). Same clamp as `:global(.overview-map)` inside
		 * the HikesOverviewMap component. */
		min-height: clamp(320px, 50vh, 520px);
		margin-left: calc(50% - 50vw);
		margin-right: calc(50% - 50vw);
		margin-top: calc(-1 * (3rem + max(12px, env(safe-area-inset-top, 0px) + 4px)));
		margin-bottom: 0;
		overflow: hidden;
		/* Transparent so the page background shows through any tile gap
		 * during the static→live cross-fade rather than Leaflet's grey
		 * default. */
		background: transparent;
	}

	/* Pre-rendered overview hero. Native pixel size + centred so it matches
	 * Leaflet's tile rendering 1:1; `cover` would scale and break alignment
	 * during the cross-fade. Wider viewports just reveal more of the
	 * 3840×2400 canvas; the union bbox (where the trails live) is always
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
		pointer-events: none;
	}

	.hero-static.faded {
		opacity: 0;
	}

	/* Three-band viewport swap (wide ≥900, medium 561–899, narrow ≤560).
	 * Each variant is rendered at a fit matching its band so Leaflet picks
	 * the same zoom on first paint — without this the desktop hero would
	 * land too zoomed-in on tablets/phones (its pose was chosen for
	 * ~1920 CSS px), and the narrow hero would land too zoomed-out on
	 * tablets (chosen for ~400 CSS px). */
	.hero-static-medium,
	.hero-static-narrow { display: none; }
	@media (max-width: 899px) {
		.hero-static-wide { display: none; }
		.hero-static-medium { display: block; }
	}
	@media (max-width: 560px) {
		.hero-static-medium { display: none; }
		.hero-static-narrow { display: block; }
	}

	/* Live overview map sits above the static; transparent so the static
	 * shows through until Leaflet's tile pane paints over it. */
	.hero-map :global(.overview-map) {
		position: relative;
		z-index: 2;
		background: transparent;
	}

	/* Push Leaflet's top-left controls below the sticky nav. */
	.hero-map :global(.leaflet-top) {
		top: calc(3rem + max(12px, env(safe-area-inset-top, 0px) + 4px) + 0.5rem);
	}

	/* Breathing room between the full-bleed hero map and the filter bar. */
	.below-hero {
		margin-top: 2rem;
	}

	.grid {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	li {
		display: contents;
	}

	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 3rem 1rem;
	}

	/* Tiny, muted map-licence credit at the very bottom of the listing. */
	.map-credit {
		margin-top: 2.5rem;
		padding: 0 1rem;
		text-align: center;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}

	.map-credit a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
		text-underline-offset: 0.18em;
		transition: color var(--transition-fast);
	}

	.map-credit a:hover {
		color: var(--color-primary);
	}

	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}

	/* Wrapper sets the view-transition name/class on the filter bar so the
	 * same .hike-fly-in rules in app.css that animate the cards also
	 * animate this bar (fly-in on /hikes enter, fly-out on /hikes exit). */
	.filter-vt-box {
		view-transition-name: hikes-filter-bar;
		view-transition-class: hike-fly-in;
	}
</style>

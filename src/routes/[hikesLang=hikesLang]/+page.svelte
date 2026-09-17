<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import HikeCard from '$lib/components/hikes/HikeCard.svelte';
	import HikesFilterBar from '$lib/components/hikes/HikesFilterBar.svelte';
	import HikesOverviewMap from '$lib/components/hikes/HikesOverviewMap.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { HIKES_OVERVIEW } from '$lib/data/hikes.generated';
	import { hikeFilterBounds } from '$lib/hikes/filterBounds';
	import { filterToParams, hubFromParams, paramsToFilter } from '$lib/hikes/browseParams';
	import { hikeAreaValues } from '$lib/hikes/hikeArea';
	import { hubFor } from '$lib/hikes/travelHub.svelte';
	import { travelEstimate } from '$lib/hikes/travel';
	import type { Difficulty } from '$types/hikes';
	import { m, ogLocale as ogLocaleFor, SITE, type HikesLang } from '$lib/js/hikesI18n';

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
	const lang = $derived(data.lang as HikesLang);
	const t = $derived(m[lang]);
	// Absolute by hand: `resolve()` is relative during SSR.
	const canonical = $derived(`${SITE}/${data.hikesLang}`);
	const ogLocale = $derived(ogLocaleFor(lang));

	// Fades the SSR-rendered static overview hero out once Leaflet's first
	// schematic-tile batch has loaded. Same handover pattern as the detail
	// page's hero map.
	let heroMapReady = $state(false);
	/** Cards whose images load straight away — two rows of the 4-up grid. */
	const EAGER_CARDS = 8;
	// Blurred stand-ins for the three hero variants; CSS picks the one whose
	// media query matches, like the `<picture>` does for the image.
	const heroLqip =
		[
			HIKES_OVERVIEW?.blur && `--lqip-wide:url("${HIKES_OVERVIEW.blur}")`,
			HIKES_OVERVIEW?.blurMedium && `--lqip-medium:url("${HIKES_OVERVIEW.blurMedium}")`,
			HIKES_OVERVIEW?.blurNarrow && `--lqip-narrow:url("${HIKES_OVERVIEW.blurNarrow}")`
		]
			.filter(Boolean)
			.join(';') || undefined;
	// Density the overview statics were rendered at — see the detail page's
	// `heroSrcset` for why this goes into `srcset` with no `src`.
	const heroSrcset = (url: string) => `${url} ${HIKES_OVERVIEW?.density ?? 1}x`;

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

	// The filter is read out of the URL while rendering, not applied afterwards in
	// an effect: an effect never runs on the server, so a script-free browser would
	// receive the full listing however it had filtered it. Reading it here means the
	// server renders exactly the subset the address bar asks for.
	//
	// Bounds come from the same helper the bar uses for its slider tracks, so an
	// untouched range sits exactly on its track end and reads as "not narrowed".
	//
	// The travel range is the one bound that moves: it is measured from a
	// departure hub, and the reader can change which. `hubFor` resolves the
	// filter's own choice against the request's (cookie / GeoIP2), and the bar
	// derives its track from the same expression.
	//
	// Seeded once, on purpose: this is the reader's working copy of the filter,
	// mutated by clicks afterwards, so it must not follow `data` — hence the
	// `untrack`, which is the compiler's word for "yes, the initial value".
	const filter = $state(
		untrack(() =>
			paramsToFilter(
				page.url.searchParams,
				hikeFilterBounds(data.hikes, hubFor(hubFromParams(page.url.searchParams)), data.travel)
			)
		)
	);
	const hub = $derived(hubFor(filter.hub));
	const bounds = $derived(hikeFilterBounds(data.hikes, hub, data.travel));

	// With script, a facet click mutates the filter directly and the address bar
	// follows — which keeps every link in the bar pointing at the right place, since
	// those hrefs are built from the filter as it stands. `replaceState` rather than
	// `goto` keeps history clean: toggling four tags would otherwise leave four
	// back-button stops.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const next = filterToParams(filter, bounds).toString();
		const current = new URL(window.location.href);
		const currentQuery = current.searchParams.toString();
		// Skip the no-op rewrite — `replaceState` would still touch history's state
		// object and trigger downstream `page.url` effects for no UX benefit.
		if (next === currentQuery) return;
		current.search = next;
		replaceState(current, page.state);
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
			// Travel time only excludes anything once the range is actually
			// narrowed. At full extent a hike the timetable can't reach from
			// this hub still belongs in the listing — the reader asked for
			// hikes, not for a departure board — and it is only when they say
			// "at most two hours" that "no answer" stops qualifying.
			if (filter.minTravelMin > bounds.travel.min || filter.maxTravelMin < bounds.travel.max) {
				const est = travelEstimate(data.travel, h.slug, hub, 'toStart');
				if (est.state !== 'ok') continue;
				if (est.totalMin < filter.minTravelMin || est.totalMin > filter.maxTravelMin) continue;
			}
			if (filter.difficulties.size > 0 && !filter.difficulties.has(h.difficulty)) continue;
			if (filter.regions.size > 0 && (!h.region || !filter.regions.has(h.region))) continue;
			if (filter.areas.size > 0) {
				// Any level counts: picking Österreich keeps a hike filed under
				// Kärnten, picking Kärnten keeps only that one.
				const areas = hikeAreaValues(h.canton, h.country, h.state);
				if (!areas.some((a) => filter.areas.has(a.value))) continue;
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

<Seo title={t.seo_title} description={t.seo_description} {lang} locale={ogLocale} {canonical} />

<section class="hikes-page">
	<section class="hero-map" aria-label={t.overview}>
		{#if HIKES_OVERVIEW}
			<!-- Build-time render of the labelled aerial map + every
			     visible hike's preview polyline, coloured by SAC tier.
			     Displayed at native pixel size (`object-fit: none`) so it
			     overlays the live map exactly. The image fades out
			     once the live map has drawn. Three width variants
			     ship — wide (≥900 CSS px), medium (561–899), narrow (≤560) —
			     as `<source media>` so the browser fetches only the one it
			     shows (CSS-hidden `<img>`s would all download). -->
			<picture>
				{#if HIKES_OVERVIEW.urlNarrow}
					<source media="(max-width: 560px)" srcset={heroSrcset(HIKES_OVERVIEW.urlNarrow)} />
				{/if}
				{#if HIKES_OVERVIEW.urlMedium}
					<source media="(max-width: 899px)" srcset={heroSrcset(HIKES_OVERVIEW.urlMedium)} />
				{/if}
				<img
					class="hero-static"
					class:faded={heroMapReady}
					srcset={heroSrcset(HIKES_OVERVIEW.url)}
					alt=""
					aria-hidden="true"
					loading="eager"
					fetchpriority="high"
					decoding="async"
					style={heroLqip}
				/>
			</picture>
		{/if}
		<HikesOverviewMap
			hikes={visible}
			initialCenter={overviewPose?.center}
			initialZoom={overviewPose?.zoom}
			onReady={() => (heroMapReady = true)}
		/>
		<div class="hero-title">
			<h1>{t.seo_title}</h1>
		</div>
	</section>

	<div class="below-hero">
		<!-- Wrapped in a named view-transition box so the filter bar can fly
		     up alongside the cards when arriving at /hikes from outside the
		     hikes group. Same `view-transition-class: hike-fly-in` as each
		     HikeCard so one CSS rule animates both. -->
		<div class="filter-vt-box">
			<HikesFilterBar
				hikes={data.hikes}
				travel={data.travel}
				{filter}
				resultCount={visible.length}
				totalCount={data.hikes.length}
				totalKm={totals.km}
				totalGain={totals.gain}
				facetPath={page.url.pathname}
				{lang}
			/>
		</div>

		{#if visible.length === 0}
			<p class="empty">{t.empty_filters}</p>
		{:else}
			<ul class="grid">
				{#each visible as hike, i (hike.slug)}
					<li>
						<!-- The first two rows are on screen on arrival; the rest
						     load as they scroll in. -->
						<HikeCard {hike} travel={data.travel} {lang} eager={i < EAGER_CARDS} />
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Tiny swisstopo credit. The map's own attribution control is hidden
		     for a cleaner frame, but their tile licence still requires the
		     credit to appear somewhere on the page. -->
		<footer class="map-credit">
			{t.map_data} &copy;
			<a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener noreferrer">swisstopo</a>
			·
			<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>,
			<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>,
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
	/* Title overlay, bottom-left over the map — the same treatment the detail
	 * page gives a hike's name, so the two hero maps read as one family. */
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
	 * 3840×720 CSS px canvas; the union bbox (where the trails live) is always
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
		/* Blurred stand-in (set inline from `HIKES_OVERVIEW.blur*`) plus its
		   dither, covering the hero box until the rendered overview WebP
		   decodes. */
		background-image: var(--lqip-grain), var(--lqip, none);
		background-size: 96px 96px, cover;
		background-position: center, center;
		background-repeat: repeat, no-repeat;
	}

	.hero-static.faded {
		opacity: 0;
	}

	/* Three-band viewport swap (wide ≥900, medium 561–899, narrow ≤560).
	 * Each variant is rendered at a fit matching its band so Leaflet picks
	 * the same zoom on first paint — without this the desktop hero would
	 * land too zoomed-in on tablets/phones (its pose was chosen for
	 * ~1920 CSS px), and the narrow hero would land too zoomed-out on
	 * tablets (chosen for ~400 CSS px). The `<picture>` picks the image;
	 * these pick the matching blurred stand-in. */
	.hero-static { --lqip: var(--lqip-wide, none); }
	@media (max-width: 899px) {
		.hero-static { --lqip: var(--lqip-medium, var(--lqip-wide, none)); }
	}
	@media (max-width: 560px) {
		.hero-static { --lqip: var(--lqip-narrow, var(--lqip-wide, none)); }
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

	/* Phones: two cards per row, like the recipe grid (.recipe-grid in app.css). */
	@media (max-width: 599px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.8em;
		}
	}
	@media (max-width: 250px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* Wrapper sets the view-transition name/class on the filter bar so the
	 * same .hike-fly-in rules in app.css that animate the cards also
	 * animate this bar (fly-in on /hikes enter, fly-out on /hikes exit). */
	.filter-vt-box {
		view-transition-name: hikes-filter-bar;
		view-transition-class: hike-fly-in;
		/* The name makes this a stacking context, which traps the filter panel's
		   typeahead dropdown inside it — and the cards below are stacking contexts
		   of their own (each carries a `view-transition-name` too), painted later
		   in DOM order and therefore on top of it. Lifting the box above them puts
		   the dropdown back over the listing where it belongs. */
		position: relative;
		z-index: 2;
	}
</style>

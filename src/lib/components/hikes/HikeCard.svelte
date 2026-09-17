<script lang="ts">
	import { resolve } from '$app/paths';
	import Route from '@lucide/svelte/icons/route';
	import Clock from '@lucide/svelte/icons/clock';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Mountain from '@lucide/svelte/icons/mountain';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import TrainFront from '@lucide/svelte/icons/train-front';
	import { resolveHikeArea } from '$lib/hikes/hikeArea';
	import { graphicPlaceholder } from '$lib/hikes/graphicPlaceholder';
	import { HIKE_AREA_PLACEHOLDER } from '$lib/data/hikeAreaPlaceholder.generated';
	import { formatTravelMinutes, travelEstimate } from '$lib/hikes/travel';
	import { activeHub } from '$lib/hikes/travelHub.svelte';
	import { altFor, fmt, hikesSlugFromLang, hikeText, m, MONTHS_SHORT, type HikesLang } from '$lib/js/hikesI18n';
	import type { HikeManifestEntry, HikeTravelTable } from '$types/hikes';

	interface Props {
		hike: HikeManifestEntry;
		/** Precomputed travel times, fetched by the route (see `HIKE_TRAVEL_URL`).
		 * Absent simply means no travel chip. */
		travel?: HikeTravelTable | null;
		/** UI language; also picks the translated title when one exists. */
		lang?: HikesLang;
		/** Load the images straight away — for cards on screen on arrival.
		 * Everything else loads lazily as it scrolls in. */
		eager?: boolean;
	}

	const { hike, travel: travelTable = null, lang = 'de', eager = false }: Props = $props();
	const loading = $derived(eager ? 'eager' : 'lazy');
	// Icons and emblems always wait behind the photos (lazy, low priority);
	// a simplified stand-in holds their place meanwhile.
	const iconPh = $derived(graphicPlaceholder(hike.iconPlaceholder));
	const t = $derived(m[lang]);
	const text = $derived(hikeText(hike, lang));

	// A multi-day hike counts its days (one per stage); summed walking hours
	// would read as a single long day.
	const durationLabel = $derived(
		hike.stages && hike.stages.length > 1
			? fmt(t.days_n, { n: hike.stages.length })
			: hike.durationMin !== null && hike.durationMin > 0
				? `${Math.floor(hike.durationMin / 60)}h ${hike.durationMin % 60}m`
				: '—'
	);

	// SAC trail-sign colour scheme (matches the detail page):
	// T1 yellow Wegweiser, T2/T3 white-red-white Bergwanderweg,
	// T4–T6 white-blue-white Alpinwanderweg.
	const sacBand = $derived.by<'yellow' | 'red' | 'blue'>(() => {
		if (hike.difficulty === 'T1') return 'yellow';
		if (hike.difficulty === 'T2' || hike.difficulty === 'T3') return 'red';
		return 'blue';
	});

	// Public-transport travel time to the trailhead from the reader's hub —
	// precomputed, see $lib/hikes/travel. Shown only when there is a real
	// number: a hike the timetable can't reach in time, or one whose legs were
	// never fetched, says nothing here rather than guessing. The detail page's
	// JourneyPlanner is where the awkward cases get explained.
	const travel = $derived(travelEstimate(travelTable, hike.slug, activeHub(), 'toStart'));

	const seasonLabel = $derived.by(() => {
		const a = hike.seasonStart;
		const b = hike.seasonEnd;
		if (a == null || b == null) return null;
		if (a < 1 || a > 12 || b < 1 || b > 12) return null;
		const months = MONTHS_SHORT[lang];
		return `${months[a - 1]}–${months[b - 1]}`;
	});

	// "Neu" badge for hikes published within the last 30 days. Uses the
	// frontmatter date (`YYYY-MM-DD`) compared against the build clock —
	// good enough for a prerendered listing page that rebuilds on every
	// content change.
	const isRecent = $derived.by(() => {
		const t = Date.parse(hike.date);
		if (!Number.isFinite(t)) return false;
		const days = (Date.now() - t) / 86_400_000;
		return days >= 0 && days <= 30;
	});

	// Canton coat-of-arms at home, country flag abroad.
	const area = $derived(resolveHikeArea(hike.canton, hike.country, hike.state));
	const areaPh = $derived(graphicPlaceholder(area ? HIKE_AREA_PLACEHOLDER[area.iconUrl] : undefined));
	// Swiss hikes read "<region>, <canton>". Abroad the same slot takes the
	// Bundesland (or the country, where we have no arms for the region), and
	// the second half is dropped when it would just repeat the first. The
	// canton keeps the manifest's own spelling so Ticino and Romandie hikes
	// read as they always have.
	const placeLabel = $derived(
		[
			hike.region,
			hike.canton && hike.canton !== hike.region
				? hike.canton
				: area && area.kind !== 'canton' && area.label !== hike.region
					? area.label
					: null
		]
			.filter(Boolean)
			.join(', ')
	);

</script>

<a class="card" href={resolve('/[hikesLang=hikesLang]/[slug]', { hikesLang: hikesSlugFromLang(lang), slug: hike.slug })} style="view-transition-name: hike-{hike.slug}; view-transition-class: hike-fly-in">
	<div class="cover">
		{#if hike.cover.src}
			<picture>
				<source type="image/avif" srcset={hike.cover.srcsetAvif} sizes="(max-width: 599px) 50vw, 400px" />
				<source type="image/webp" srcset={hike.cover.srcsetWebp} sizes="(max-width: 599px) 50vw, 400px" />
				<img
					src={hike.cover.src}
					alt={altFor(hike.cover, lang)}
					width={hike.cover.width}
					height={hike.cover.height}
					{loading}
					fetchpriority={eager ? 'high' : undefined}
					decoding="async"
					style={hike.cover.blur ? `--lqip:url("${hike.cover.blur}")` : undefined}
				/>
			</picture>
		{:else}
			<div class="cover-placeholder"></div>
		{/if}

		{#if hike.icon}
			<span class="icon-pin" aria-hidden="true">
				<img
					src={hike.icon}
					alt=""
					loading="lazy"
					fetchpriority="low"
					decoding="async"
					style={iconPh.style}
					{@attach iconPh.attach}
				/>
			</span>
		{/if}

		<span class="sac-pin" aria-label="{t.sac_difficulty} {hike.difficulty}">
			<span class="sac-marker sac-marker-{sacBand}">{hike.difficulty}</span>
		</span>

		{#if isRecent}
			<span class="recent-badge">{t.new_badge}</span>
		{/if}
	</div>

	<div class="body">
		<header class="head">
			<h2 class="title">{text.title}</h2>
			{#if placeLabel}
				<p class="region">
					{#if area}
						<img
							class="area-emblem"
							class:is-flag={area.kind === 'country'}
							src={area.iconUrl}
							alt=""
							aria-hidden="true"
							loading="lazy"
							fetchpriority="low"
							decoding="async"
							style={areaPh.style}
							{@attach areaPh.attach}
						/>
					{/if}<span class="region-text">{placeLabel}</span>
				</p>
			{/if}
		</header>

		<div class="metrics">
			<span title={t.distance}><Route size={14} strokeWidth={1.75} aria-hidden="true" />{hike.distanceKm.toFixed(1)} km</span>
			<span title={t.duration}><Clock size={14} strokeWidth={1.75} aria-hidden="true" />{durationLabel}</span>
			<span title={t.ascent}><TrendingUp size={14} strokeWidth={1.75} aria-hidden="true" />{hike.elevationGainM} m</span>
			<span title={t.descent}><TrendingDown size={14} strokeWidth={1.75} aria-hidden="true" />{hike.elevationLossM} m</span>
		</div>

		{#if (hike.elevationMinM !== null && hike.elevationMaxM !== null) || seasonLabel || travel.state === 'ok'}
			<footer class="foot">
				{#if hike.elevationMinM !== null && hike.elevationMaxM !== null}
					<span class="chip" title={t.altitude_range}>
						<Mountain size={12} strokeWidth={1.75} aria-hidden="true" />{hike.elevationMinM}–{hike.elevationMaxM} m
					</span>
				{/if}
				{#if seasonLabel}
					<span class="chip" title={t.recommended_season}>
						<CalendarRange size={12} strokeWidth={1.75} aria-hidden="true" />{seasonLabel}
					</span>
				{/if}
				{#if travel.state === 'ok'}
					<span
						class="chip chip-travel"
						title="{t.jp_aria}{travel.accessMin > 0
							? `, ${t.jp_incl} ${travel.accessMin} min ${t.jp_to_station}`
							: ''} — {t.estimate}"
					>
						<TrainFront size={12} strokeWidth={1.75} aria-hidden="true" /><span
							>{t.jp_hub_from} {travel.hub.label} <strong>{formatTravelMinutes(travel.totalMin)}</strong></span
						>
					</span>
				{/if}
			</footer>
		{/if}
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		transition: scale var(--transition-normal), box-shadow var(--transition-normal);
		height: 100%;
	}

	.card:hover {
		scale: 1.02;
		box-shadow: var(--shadow-hover);
	}

	.cover {
		position: relative;
		aspect-ratio: 16 / 10;
		background: var(--color-bg-elevated);
		overflow: hidden;
	}

	picture,
	.cover-placeholder {
		display: block;
		width: 100%;
		height: 100%;
	}

	picture img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* Inline blurred placeholder (see ImageVariant.blur) plus its dither —
		   the cover box has a fixed height, so it fills it until the real cover
		   decodes. */
		background-color: var(--color-bg-elevated);
		background-image: var(--lqip-grain), var(--lqip, none);
		background-size: 96px 96px, cover;
		background-position: center, center;
		background-repeat: repeat, no-repeat;
	}

	/* Per-route identity icon, top-left of cover. Floats directly on the
	 * image — a soft drop-shadow keeps it legible without a backdrop. */
	.icon-pin {
		position: absolute;
		top: 0.55rem;
		left: 0.55rem;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45));
	}

	.icon-pin img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	/* SAC difficulty badge, top-right of cover. Same approach — sits on
	 * the image with a drop-shadow for separation, no white backdrop. */
	.sac-pin {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		display: inline-flex;
		align-items: center;
		filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45));
	}

	.sac-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 22px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1;
	}

	.sac-marker-yellow {
		width: 36px;
		color: #1a1a1a;
		background: #f5a623;
		clip-path: polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%);
		/* Text in the rectangular left portion (arrow tip is right 25%). */
		justify-content: flex-start;
		padding-left: 0.45rem;
	}

	.sac-marker-red,
	.sac-marker-blue {
		width: 28px;
		color: #fff;
		text-shadow: 0 1px 1px rgb(0 0 0 / 0.45);
		border-radius: 2px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.18);
	}

	.sac-marker-red {
		background: linear-gradient(
			to bottom,
			#fff 0 25%,
			#dc1d2a 25% 75%,
			#fff 75% 100%
		);
	}

	.sac-marker-blue {
		background: linear-gradient(
			to bottom,
			#fff 0 25%,
			#2965c8 25% 75%,
			#fff 75% 100%
		);
	}

	/* Bottom-left freshness marker — only when the hike was published in
	 * the last 30 days. Small, brand-coloured, all-caps. */
	.recent-badge {
		position: absolute;
		bottom: 0.55rem;
		left: 0.55rem;
		padding: 0.18rem 0.6rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-radius: var(--radius-pill);
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.9rem 1rem 1rem;
		flex: 1 1 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.title {
		margin: 0;
		font-size: 1.2rem;
		line-height: 1.25;
		color: var(--color-text-primary);
	}

	.region {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.area-emblem {
		flex: 0 0 auto;
		width: 18px;
		height: 22px;
		object-fit: contain;
		/* Most cantonal arms are tall-rectangle shields, a couple (Schwyz,
		 * Solothurn) are squarer — `contain` keeps the proportions correct
		 * inside the fixed slot so a row of cards stays visually aligned. */
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.18));
	}

	/* Flags are 3:2 landscape. Sized off the shield's HEIGHT, not its width:
	 * contained in the portrait slot a flag comes out half as tall and reads
	 * as a lesser badge next to a canton's arms. Width follows from the ratio,
	 * so the box hugs the flag and the border sits on its edge — and that
	 * border is what keeps a white band (AT, IT, FR) from dissolving into a
	 * light surface. */
	.area-emblem.is-flag {
		width: auto;
		aspect-ratio: 3 / 2;
		border: 1px solid rgb(0 0 0 / 0.18);
		border-radius: 2px;
	}

	.region-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.metrics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.85rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.metrics span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.metrics :global(svg) {
		color: var(--color-primary);
		flex: 0 0 auto;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: auto;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.55rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		border-radius: var(--radius-pill);
	}

	.chip :global(svg) {
		color: var(--color-text-secondary);
		flex: 0 0 auto;
	}

	/* The travel chip is about the reader, not the route — everything else on
	   the card is a property of the hike itself. The tinted icon is the whole
	   distinction; a differently-coloured chip would pull rank over the title. */
	.chip-travel :global(svg) {
		color: var(--color-primary);
	}

	/* "ab Zürich HB 2 h 55" — the hub is context, the number is the answer, so
	   only the number gets the stronger ink. Both live in one <span> so the
	   chip's flex gap separates icon from text and nothing else; as separate
	   flex items the label and the number would lose the space between them. */
	.chip-travel strong {
		font-weight: 600;
		color: var(--color-text-primary);
	}
	/* Two cards per row on phones (the listing's grid matches .recipe-grid):
	 * tighter type and padding so a card still reads at half the width. */
	@media (max-width: 599px) {
		.body {
			gap: 0.45rem;
			padding: 0.6rem 0.65rem 0.7rem;
		}
		.title {
			font-size: 0.95rem;
			line-height: 1.2;
		}
		.region,
		.metrics {
			font-size: 0.72rem;
		}
		.metrics {
			gap: 0.25rem 0.55rem;
		}
		.area-emblem {
			width: 14px;
			height: 17px;
		}
		.icon-pin {
			width: 36px;
			height: 36px;
		}
		.chip {
			font-size: 0.65rem;
			padding: 0.15rem 0.45rem;
		}
	}
</style>

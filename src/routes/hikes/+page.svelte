<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import HikeCard from '$lib/components/hikes/HikeCard.svelte';
	import HikesFilterBar, { type HikesFilter } from '$lib/components/hikes/HikesFilterBar.svelte';
	import HikesOverviewMap from '$lib/components/hikes/HikesOverviewMap.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import type { Difficulty } from '$types/hikes';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	// Filter ceilings start wide-open so the initial render (SSR + first
	// hydration pass) shows every hike. `$effect` below clamps them down
	// to the actual data maxes once `data.hikes` is fully populated —
	// reading `data.hikes` synchronously at script-init turned out to be
	// fragile during dev hydration (it sporadically returned a one-hike
	// subset, which then locked the filter to that one hike until the
	// next navigation cycle).
	const filter = $state<HikesFilter>({
		maxDistanceKm: Number.POSITIVE_INFINITY,
		maxDurationMin: Number.POSITIVE_INFINITY,
		maxGainM: Number.POSITIVE_INFINITY,
		maxLossM: Number.POSITIVE_INFINITY,
		difficulties: new SvelteSet<Difficulty>(),
		regions: new SvelteSet<string>()
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
		filter.maxDistanceKm = Math.max(1, ...data.hikes.map((h) => Math.ceil(h.distanceKm)));
		filter.maxDurationMin = Math.max(60, ...data.hikes.map((h) => h.durationMin ?? 0));
		filter.maxGainM = Math.max(100, ...data.hikes.map((h) => h.elevationGainM));
		filter.maxLossM = Math.max(100, ...data.hikes.map((h) => h.elevationLossM));
		filterDefaultsApplied = true;
	});

	const visible = $derived.by(() => {
		const out = [];
		for (const h of data.hikes) {
			if (h.distanceKm > filter.maxDistanceKm) continue;
			if ((h.durationMin ?? 0) > filter.maxDurationMin) continue;
			if (h.elevationGainM > filter.maxGainM) continue;
			if (h.elevationLossM > filter.maxLossM) continue;
			if (filter.difficulties.size > 0 && !filter.difficulties.has(h.difficulty)) continue;
			if (filter.regions.size > 0 && (!h.region || !filter.regions.has(h.region))) continue;
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
		<HikesOverviewMap hikes={visible} />
	</section>

	<div class="below-hero">
		<header class="page-header">
			<p class="subtitle">
				<strong>{visible.length}</strong> von {data.hikes.length} Touren
			</p>
			{#if visible.length > 0}
				<dl class="totals" aria-label="Gesamtsumme der gefilterten Touren">
					<div><dt>Distanz</dt><dd>{totals.km} km</dd></div>
					<div><dt>Aufstieg</dt><dd>{totals.gain.toLocaleString('de-CH')} m</dd></div>
				</dl>
			{/if}
		</header>

		<HikesFilterBar hikes={data.hikes} {filter} />

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
		margin-left: calc(50% - 50vw);
		margin-right: calc(50% - 50vw);
		margin-top: calc(-1 * (3rem + max(12px, env(safe-area-inset-top, 0px) + 4px)));
		margin-bottom: 0;
		overflow: hidden;
	}

	/* Push Leaflet's top-left controls below the sticky nav. */
	.hero-map :global(.leaflet-top) {
		top: calc(3rem + max(12px, env(safe-area-inset-top, 0px) + 4px) + 0.5rem);
	}

	.page-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.subtitle strong {
		color: var(--color-text-primary);
		font-weight: 700;
	}

	.totals {
		display: flex;
		gap: 1.25rem;
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.totals div {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.totals dt {
		margin: 0;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}

	.totals dd {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
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

	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>

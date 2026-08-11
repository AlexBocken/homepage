<script lang="ts">
	/**
	 * Filter rail beside a ranked recipe grid — the shape every recipe listing
	 * uses: the index, search results, a category, a keyword, a month, an icon,
	 * favourites.
	 *
	 * The page owns the `createRecipeBrowse()` instance and seeds it with
	 * whatever the route is already about (a category, a keyword, a query), so
	 * that filter shows up pressed in the rail and can be lifted from there.
	 * Everything below is the same for all of them.
	 */
	import { resolve } from '$app/paths';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import CompactCard from '$lib/components/recipes/CompactCard.svelte';
	import RecipeFilterRail from '$lib/components/recipes/RecipeFilterRail.svelte';
	import { m, type RecipesLang } from '$lib/js/recipesI18n';
	import type { RankedRecipe, RecipeBrowse } from '$lib/js/recipeBrowse.svelte';

	interface Props {
		browse: RecipeBrowse;
		lang: RecipesLang;
		recipeLang: string;
		isLoggedIn?: boolean;
		/** A listing that is already only favourites has no use for the toggle. */
		showFavoritesFilter?: boolean;
		/** Season and icon listings show the icon rather than the photo. */
		iconOverride?: boolean;
	}

	let {
		browse,
		lang,
		recipeLang,
		isLoggedIn = false,
		showFavoritesFilter = true,
		iconOverride = false
	}: Props = $props();

	const t = $derived(m[lang]);
	const routePrefix = $derived(resolve('/[recipeLang=recipeLang]', { recipeLang }));

	// Incremental rendering
	const BATCH_SIZE = 24;
	let visibleCount = $state(BATCH_SIZE);
	let sentinel = $state<HTMLElement | null>(null);
	let filtersOpen = $state(false);

	// Any change to the result set starts the page over from the first batch.
	$effect(() => {
		browse.results;
		visibleCount = BATCH_SIZE;
	});

	$effect(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				visibleCount += BATCH_SIZE;
			}
		}, { rootMargin: '200px' });
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	// `results` is already [in-season…, everything else…], so one slice keeps
	// both groups in order and the batching honest.
	const visible = $derived(browse.results.slice(0, visibleCount));
	const visibleInSeason = $derived(visible.slice(0, Math.min(visibleCount, browse.inSeason.length)));
	const visibleRest = $derived(visible.slice(visibleInSeason.length));
	const hasMore = $derived(visibleCount < browse.results.length);
</script>

<style>
/* ─── Two-column browse: filters left, results right ───
   The rail lives in the gutter *beside* the content, not inside it: the
   results column keeps the full 1200px the rest of the site uses, so the
   grid still fits four cards at max width and three well before that. */
.browse {
	--rail-w: 240px;
	--rail-gap: 2rem;
	max-width: calc(1200px + var(--rail-w) + var(--rail-gap));
	margin: 2.5em auto 0;
	padding: 0 1rem;
	display: grid;
	grid-template-columns: var(--rail-w) minmax(0, 1fr);
	gap: var(--rail-gap);
	align-items: start;
}
/* Slightly tighter cards than the site-wide grid: with the rail beside it the
   column is narrower, and four across at full width beats three plus air. */
@media (min-width: 1024px) {
	.browse :global(.recipe-grid) {
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
	}
}
.rail-column {
	position: sticky;
	/* Clears the sticky header. */
	top: 5.5rem;
	/* Taller than the window, so it scrolls within itself rather than being cut
	   off. This only holds because nothing above it is transformed — see the
	   note on .hero-layer in the listing page. */
	max-height: calc(100vh - 7rem);
	overflow-y: auto;
	overscroll-behavior: contain;
	/* Room for the range-slider thumbs, which overhang their track at 0 % and
	   100 %; without it the scroll container gains a horizontal axis and the
	   column drifts sideways when a thumb takes focus. */
	padding-inline: 0.75rem;
	margin-inline: -0.75rem;
}

/* ─── Group headers: the ranking, stated once ─── */
.group-head {
	display: flex;
	align-items: baseline;
	gap: 0.6em;
	margin: 0 0 1.2em;
	/* Line the rule up with the cards: .recipe-grid carries its own padding. */
	padding: 0 0.8em 0.5em;
	border-bottom: 1px solid var(--color-border);
}
@media (min-width: 600px) {
	.group-head { padding: 0 1.5em 0.5em; }
}
.group-head h2 {
	margin: 0;
	font-size: 0.8rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--color-text-primary);
	white-space: nowrap;
}
.group-head .count {
	font-size: 0.8rem;
	color: var(--color-text-secondary);
	font-variant-numeric: tabular-nums;
}
.group-head .note {
	margin-left: auto;
	font-size: 0.75rem;
	color: var(--color-text-tertiary);
	white-space: nowrap;
}
.group + .group { margin-top: 3em; }

.mobile-bar {
	display: none;
}

.empty {
	padding: 3em 0;
	text-align: center;
	color: var(--color-text-secondary);
}
.empty button {
	margin-top: 1em;
	background: var(--color-primary);
	color: var(--color-text-on-primary);
	border: none;
	border-radius: var(--radius-pill);
	padding: 0.6em 1.4em;
	font-size: 0.9rem;
	cursor: pointer;
}

.sentinel {
	height: 1px;
}

@media (max-width: 1150px) {
	.browse {
		grid-template-columns: minmax(0, 1fr);
		gap: 0;
		padding: 0 1rem;
	}
	.rail-column {
		position: static;
		max-height: none;
		overflow: visible;
	}
	/* One row above the grid: what you are looking at, and the way in. */
	.mobile-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5em;
		padding: 0 0.8em;
	}
	.mobile-bar .result-count {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.filters-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: 0.5em 1.1em;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		cursor: pointer;
		box-shadow: var(--shadow-sm);
	}
	.filters-trigger .badge {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-radius: var(--radius-pill);
		padding: 0 0.5em;
		font-size: 0.75rem;
	}
	.group-head .note { display: none; }
}
</style>

{#snippet grid(entries: RankedRecipe[], eager: boolean)}
	<div class="recipe-grid">
		{#each entries as entry, i (entry.recipe._id)}
			<CompactCard
				recipe={entry.recipe}
				isFavorite={entry.recipe.isFavorite}
				showFavoriteIndicator={isLoggedIn}
				icon_override={iconOverride}
				loading_strat={eager && i < 12 ? 'eager' : 'lazy'}
				{routePrefix}
			/>
		{/each}
	</div>
{/snippet}

<div class="browse">
	<div class="rail-column">
		<RecipeFilterRail
			{browse}
			{lang}
			showFavorites={isLoggedIn && showFavoritesFilter}
			bind:open={filtersOpen}
		/>
	</div>
	<div>
		<div class="mobile-bar">
			<button class="filters-trigger" onclick={() => (filtersOpen = true)}>
				<SlidersHorizontal size={16} />
				{t.filters}
				{#if browse.activeCount > 0}<span class="badge">{browse.activeCount}</span>{/if}
			</button>
			<span class="result-count">{browse.results.length} {t.recipes_count_suffix}</span>
		</div>

		{#if browse.results.length === 0}
			<p class="empty">
				{t.no_recipes_found}<br />{t.try_other_search}
				<br />
				<button onclick={() => browse.reset()}>{t.clear_all_filters}</button>
			</p>
		{:else}
			{#if visibleInSeason.length > 0}
				<section class="group">
					<div class="group-head">
						<h2>{t.in_season_heading}</h2>
						<span class="count">{browse.inSeason.length}</span>
						<span class="note">{t.in_season_ordering_note}</span>
					</div>
					{@render grid(visibleInSeason, true)}
				</section>
			{/if}

			{#if visibleRest.length > 0}
				<section class="group">
					{#if browse.grouped}
						<div class="group-head">
							<h2>{t.everything_else}</h2>
							<span class="count">{browse.rest.length}</span>
						</div>
					{/if}
					{@render grid(visibleRest, visibleInSeason.length === 0)}
				</section>
			{/if}
		{/if}

		{#if hasMore}
			<div class="sentinel" bind:this={sentinel}></div>
		{/if}
	</div>
</div>

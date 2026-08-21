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
	import { page } from '$app/state';
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
		/**
		 * Where the rail's filters link to for a reader with no script — the listing's
		 * own path. Only pages that apply those parameters while rendering pass one;
		 * see RecipeFilterRail.
		 */
		facetPath?: string | null;
	}

	let {
		browse,
		lang,
		recipeLang,
		isLoggedIn = false,
		showFavoritesFilter = true,
		iconOverride = false,
		facetPath = null
	}: Props = $props();

	const t = $derived(m[lang]);
	const routePrefix = $derived(resolve('/[recipeLang=recipeLang]', { recipeLang }));

	// Incremental rendering
	const BATCH_SIZE = 24;
	// How many are rendered. The URL can ask for more, which is the only way to reach
	// the second batch when the observer below has no script to run in: each press of
	// the link at the foot of the grid comes back with a larger number.
	const askedFor = Number(page.url.searchParams.get('shown'));
	let visibleCount = $state(
		Number.isInteger(askedFor) && askedFor > 0 ? Math.min(askedFor, 2000) : BATCH_SIZE
	);
	let sentinel = $state<HTMLElement | null>(null);
	let filtersOpen = $state(false);
	// The sheet's open state lives in a checkbox inside the rail; this is the id the
	// trigger below points at, so opening the filters needs no script.
	const filtersId = $props.id();

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

	/**
	 * The same listing with every result rendered, for a reader with no script.
	 *
	 * All of them rather than one more batch: with script the rest arrive by
	 * scrolling, so paging through in twenty-fours would only be a way of making
	 * someone press a link six times to reach what everyone else gets for free. The
	 * whole set is already in memory either way — only the markup is being held back.
	 *
	 * The fragment lands them back at the foot of the grid rather than at the top.
	 */
	const moreHref = $derived.by(() => {
		if (!facetPath || !hasMore) return null;
		const next = new URLSearchParams(page.url.searchParams);
		next.set('shown', String(browse.results.length));
		return `${facetPath}?${next}#more`;
	});

	// ── Reserved height for the batches not rendered yet ──────────────────────
	// Every filter's full result set is already in memory; only the DOM is being
	// held back. So the page's final height is knowable from the first paint, and
	// withholding it is what makes the scrollbar shrink under the thumb on every
	// batch — you grab it, the page grows, and the grip you took is somewhere else.
	// A spacer standing in for the missing rows keeps the total constant: as cards
	// arrive it gives back exactly the height they take.
	let resultsEl = $state<HTMLElement | null>(null);
	let columns = $state(0);
	let rowHeight = $state(0);

	/**
	 * Read the geometry off the last grid actually on screen rather than assuming
	 * it. The column count comes from the resolved template, so `auto-fill` and
	 * every breakpoint are accounted for without repeating the CSS here, and the
	 * row height is averaged over the rendered rows — cards differ by a line of
	 * title, and a row is as tall as its tallest card.
	 */
	function measureGrid() {
		const grids = resultsEl?.querySelectorAll('.recipe-grid');
		const grid = grids?.length ? (grids[grids.length - 1] as HTMLElement) : null;
		if (!grid || grid.children.length === 0) return;

		const cs = getComputedStyle(grid);
		const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
		const gap = parseFloat(cs.rowGap) || 0;
		if (cols < 1) return;

		const rows = Math.ceil(grid.children.length / cols);
		const height = (grid.getBoundingClientRect().height - (rows - 1) * gap) / rows + gap;
		if (!Number.isFinite(height) || height <= 0) return;

		// Guarded so a re-measure that finds nothing new writes nothing, which is
		// what stops the observer below from chasing its own tail.
		if (cols !== columns) columns = cols;
		if (Math.abs(height - rowHeight) > 0.5) rowHeight = height;
	}

	$effect(() => {
		visible.length;
		measureGrid();
	});

	$effect(() => {
		if (!resultsEl) return;
		const observer = new ResizeObserver(() => measureGrid());
		observer.observe(resultsEl);
		return () => observer.disconnect();
	});

	const spacerHeight = $derived(
		columns > 0 && rowHeight > 0
			? Math.ceil(Math.max(0, browse.results.length - visibleCount) / columns) * rowHeight
			: 0
	);
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
	/* The gutter is reserved whether or not the column currently scrolls: opening a
	   section is what pushes it past the window's height, and without this the
	   scrollbar arriving narrows the column and shifts every filter above it left. */
	scrollbar-gutter: stable;
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
/* Button or link to the same place, depending on whether the page can honour the
   link without script — both read as the one way out of an empty listing. */
.empty button,
.empty .clear-filters {
	display: inline-block;
	margin-top: 1em;
	background: var(--color-primary);
	color: var(--color-text-on-primary);
	border: none;
	border-radius: var(--radius-pill);
	padding: 0.6em 1.4em;
	font-size: 0.9rem;
	text-decoration: none;
	cursor: pointer;
}

.sentinel {
	height: 1px;
}

/* The way to the next batch when the observer above cannot run. */
.more-results {
	display: none;
}
@media (scripting: none) {
	.more-results {
		display: block;
		width: fit-content;
		margin: 2rem auto 0;
		padding: 0.6em 1.4em;
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text-primary);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
	}
	.more-results:hover {
		background: var(--color-bg-elevated);
	}
}
/* Holds the place of the rows still to come. Empty on purpose: it exists to be
   the right height, and shrinks to nothing as the cards it stands for arrive. */
.spacer {
	pointer-events: none;
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
			{facetPath}
			showFavorites={isLoggedIn && showFavoritesFilter}
			toggleId={filtersId}
			bind:open={filtersOpen}
		/>
	</div>
	<div bind:this={resultsEl}>
		<div class="mobile-bar">
			<label class="filters-trigger" for={filtersId}>
				<SlidersHorizontal size={16} />
				{t.filters}
				{#if browse.activeCount > 0}<span class="badge">{browse.activeCount}</span>{/if}
			</label>
			<span class="result-count">{browse.results.length} {t.recipes_count_suffix}</span>
		</div>

		{#if browse.results.length === 0}
			<p class="empty">
				{t.no_recipes_found}<br />{t.try_other_search}
				<br />
				<!-- The way out of a listing that shows nothing. A link to the unfiltered
					 listing where the page can honour one, so it still works with no
					 script — an empty state whose only escape does nothing is a dead end. -->
				{#if facetPath}
					<a class="clear-filters" href={facetPath} onclick={(e) => { e.preventDefault(); browse.reset(); }}>
						{t.clear_all_filters}
					</a>
				{:else}
					<button class="clear-filters" onclick={() => browse.reset()}>{t.clear_all_filters}</button>
				{/if}
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
			<!-- Sentinel first: it has to sit against the last rendered card so the
			     next batch is asked for before the reserved space is reached. -->
			<div class="sentinel" bind:this={sentinel}></div>
			{#if spacerHeight > 0}
				<div class="spacer" style:height="{spacerHeight}px" aria-hidden="true"></div>
			{/if}
			{#if moreHref}
				<!-- Only reachable with no script: with it, the sentinel above has
				     already asked for the next batch by the time this would be read. -->
				<a id="more" class="more-results" href={moreHref} data-sveltekit-noscroll>
					{t.show_all_recipes} ({browse.results.length - visibleCount})
				</a>
			{/if}
		{/if}
	</div>
</div>

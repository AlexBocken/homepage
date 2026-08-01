<script lang="ts">
	import { resolve } from '$app/paths';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import type { PageData } from './$types';
	import AddButton from '$lib/components/AddButton.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import CompactCard from '$lib/components/recipes/CompactCard.svelte';
	import RecipeFilterRail from '$lib/components/recipes/RecipeFilterRail.svelte';
	import { createRecipeBrowse, type RankedRecipe } from '$lib/js/recipeBrowse.svelte';
	import { m, type RecipesLang } from '$lib/js/recipesI18n';

	let { data } = $props<{ data: PageData }>();
	const lang = $derived(data.lang as RecipesLang);
	const t = $derived(m[lang]);

	const isEnglish = $derived(lang === 'en');

	const browse = createRecipeBrowse(() => data.all_brief);

	// Deep links from elsewhere on the site (`?q=`, `?category=`, `?tag=`) land
	// pre-filtered; after that the writer below owns the URL.
	let urlApplied = $state(false);
	$effect(() => {
		if (urlApplied || typeof window === 'undefined') return;
		const params = page.url.searchParams;
		browse.query = params.get('q') ?? '';
		browse.category = params.get('category');
		for (const tag of params.getAll('tag')) browse.tags.add(tag);
		if (params.get('season') === 'now') browse.inSeasonOnly = true;
		urlApplied = true;
	});

	// Keep the address bar in step so a filtered listing is shareable.
	// `replaceState` rather than `goto`: toggling four keywords should not leave
	// four back-button stops.
	$effect(() => {
		if (!urlApplied || typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		const next = new URLSearchParams();
		if (browse.query.trim()) next.set('q', browse.query.trim());
		if (browse.category) next.set('category', browse.category);
		for (const tag of [...browse.tags].sort()) next.append('tag', tag);
		if (browse.inSeasonOnly) next.set('season', 'now');
		if (next.toString() === url.searchParams.toString()) return;
		url.search = next.toString();
		replaceState(url, page.state);
	});

	// Pick a seasonal hero recipe (changes daily) — only recipes with hashed images
	// Only recipes with hashed images (e.g. myrecipe.a1b2c3d4.webp)
	const hasHashedImage = (r: any) => r.images?.length > 0 && /\.\w+\.\w+$/.test(r.images[0].mediapath);

	// Server-generated random index ensures SSR and client pick the same hero
	// svelte-ignore state_referenced_locally
	const heroIndex = data.heroIndex;
	const heroRecipe = $derived.by(() => {
		const seasonPool = data.season.filter(hasHashedImage);
		const pool = seasonPool.length > 0 ? seasonPool : data.all_brief.filter(hasHashedImage);
		if (pool.length === 0) return null;
		return pool[Math.floor(heroIndex * pool.length)];
	});
	const heroImg = $derived(
		heroRecipe ? heroRecipe.images[0].mediapath : ''
	);
	const heroColor = $derived(
		heroRecipe ? (heroRecipe.images[0].color || '') : ''
	);

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

	// IntersectionObserver for infinite scroll
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
	const routePrefix = $derived(resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang }));

	const labels = $derived({
		title: t.index_title,
		subheading: `${data.all_brief.length} ${t.recipes_growing_suffix}`,
		metaTitle: t.site_title,
		metaDescription: t.recipes_collection_meta,
		metaAlt: t.meta_alt_hero
	});
</script>
<style>
/* ─── Hero parallax ───
   Same scaleY technique as TitleImgParallax, but confined to a decorative
   layer that is *out of flow*. That matters: a transform makes an element the
   containing block for `position: fixed` and skews how `position: sticky`
   resolves its offsets, and the old markup had the whole listing inside the
   scaled box. Anything sticky in there — the filter rail — stuck to the wrong
   place. Out of flow, the transform can never reach the content tree. */
.hero-section {
	--parallax-scale: 0.3;
	position: relative;
	margin-top: calc(-3.5rem - 12px - env(safe-area-inset-top, 0px));
}
@media (prefers-reduced-motion) {
	.hero-section {
		--parallax-scale: 0;
	}
}
.hero-layer {
	position: absolute;
	inset-inline: 0;
	top: 0;
	/* How far the image keeps parallaxing before it un-sticks: its own height
	   plus a screenful. The opaque content has covered it well before then.
	   Kept modest because an out-of-flow box still counts towards the page's
	   scrollable area, and a filter that matches nothing should not leave a
	   long empty page behind. */
	height: calc(min(65vh, 560px) + 100vh);
	z-index: -1;
	pointer-events: none;
	transform-origin: center top;
	transform: scaleY(calc(1 - var(--parallax-scale)));
}

/* Sticky image — stays at top while content scrolls over it. The counter-scale
   undoes the layer's squash, so the picture keeps its true height while its
   top edge still travels at the parallax rate. */
.hero {
	position: sticky;
	top: 0;
	height: min(65vh, 560px);
	overflow: hidden;
	max-width: calc(1200px + 2rem);
	margin: 0 auto;
	transform-origin: center top;
	transform: scaleY(calc(1 / (1 - var(--parallax-scale))));
}
.hero-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: 50% 30%;
}
.hero-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		to bottom,
		rgba(0,0,0,0.1) 0%,
		rgba(0,0,0,0.55) 100%
	);
}

/* ─── Content that scrolls over the sticky hero ───
   The image is out of flow now, so the content reserves its own space. The
   parallax factor is in the sum because the layer paints the image's top edge
   at `(1 - scale)` of its scroll offset: this is where the picture's lower
   edge actually is, not where an unscaled 65vh box would put it. */
.hero-scroll-content {
	position: relative;
	padding-top: calc((1 - var(--parallax-scale)) * (min(65vh, 560px) - 20vh));
}

/* Title area: overlaps the lower portion of the hero */
.hero-text {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 2em 4.5em;
	color: white;
	position: relative;
}
.hero-text h1 {
	margin: 0;
	font-size: clamp(2.4rem, 6vw, 3.8rem);
	line-height: 1.05;
	text-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
.hero-text .subheading {
	margin: 0.3em 0 0;
	font-size: clamp(1rem, 2.5vw, 1.3rem);
	opacity: 0.9;
	text-shadow: 0 1px 6px rgba(0,0,0,0.4);
}

/* Featured recipe link — inline below subheading */
.hero-featured,
.hero-featured:visited,
.hero-featured:link {
	display: inline-flex;
	align-items: center;
	gap: 0.4em;
	margin-top: 0.5em;
	font-size: 0.95rem;
	color: white;
	text-decoration: none;
	opacity: 0.85;
	transition: var(--transition-normal);
}
.hero-featured:hover {
	opacity: 1;
}
.hero-featured .recipe-name {
	font-weight: 600;
}
.hero-featured .recipe-icon {
	font-family: "Noto Color Emoji", "Noto Color Emoji Subset", emoji, sans-serif;
}
.hero-featured .arrow-icon {
	width: 0.7em;
	height: 0.7em;
	fill: currentColor;
}

/* ─── Content below the hero ─── */
.below-hero {
	background: var(--color-bg-primary);
	padding-top: 2.5em;
	overflow: visible;
}

/* ─── Search bar — straddles the hero boundary ─── */
.hero-search-wrap {
	max-width: 1200px;
	margin: -4em auto 0;
	padding: 0 2em;
	position: relative;
	z-index: 10;
}
.search {
	width: 560px;
	max-width: 100%;
	position: relative;
	margin: 0 auto;
	font-size: 1.6rem;
	display: flex;
	align-items: center;
	transition: var(--transition-fast);
	filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
}
.search:hover,
.search:focus-within {
	scale: 1.02 1.02;
	filter: drop-shadow(0.4em 0.5em 1em rgba(0,0,0,0.6));
}
.search input {
	all: unset;
	box-sizing: border-box;
	background: var(--color-surface);
	color: var(--color-text-primary);
	padding: 0.7rem 2.6rem 0.7rem 2rem;
	border-radius: var(--radius-pill);
	width: 100%;
}
.search input::placeholder {
	color: var(--color-text-muted);
}
.search-button {
	all: unset;
	display: flex;
	justify-content: center;
	align-items: center;
	position: absolute;
	right: 0.5em;
	width: 1.5em;
	height: 1.5em;
	color: var(--color-text-tertiary);
	cursor: pointer;
	transition: color 180ms ease-in-out;
}
.search-button:hover { color: var(--color-text-primary); }
.search-button svg { width: 100%; height: 100%; }

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
	   off. This only holds because nothing above it is transformed any more —
	   see the note on .hero-layer. */
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

/* ─── No-hero fallback ─── */
.hero-fallback {
	text-align: left;
	padding: 3em 2em 1em;
	max-width: 1200px;
	margin: 0 auto;
}
.hero-fallback h1 {
	margin: 0;
	font-size: clamp(2.4rem, 6vw, 3.8rem);
	line-height: 1.05;
}
.hero-fallback .subheading {
	margin: 0.3em 0 0;
	font-size: clamp(1rem, 2.5vw, 1.3rem);
	opacity: 0.7;
}
</style>

{#snippet searchField()}
	<form class="search" method="get" action={resolve('/[recipeLang=recipeLang]/search', { recipeLang: data.recipeLang })}>
		<input
			type="text"
			id="search"
			name="q"
			placeholder={t.search_placeholder_short}
			bind:value={browse.query}
		/>
		{#if browse.query}
			<button type="button" class="search-button" onclick={() => (browse.query = '')}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>{t.clear_search_title}</title><path d="M135.19 390.14a28.79 28.79 0 0021.68 9.86h246.26A29 29 0 00432 371.13V140.87A29 29 0 00403.13 112H156.87a28.84 28.84 0 00-21.67 9.84v0L46.33 256l88.86 134.11z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33"/></svg>
			</button>
		{:else}
			<button type="submit" class="search-button">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>{t.search_title}</title><path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="m338.29 338.29 105.25 105.25"/></svg>
			</button>
		{/if}
	</form>
{/snippet}

{#snippet grid(entries: RankedRecipe[], eager: boolean)}
	<div class="recipe-grid">
		{#each entries as entry, i (entry.recipe._id)}
			<CompactCard
				recipe={entry.recipe}
				isFavorite={entry.recipe.isFavorite}
				showFavoriteIndicator={!!data.session?.user}
				loading_strat={eager && i < 12 ? 'eager' : 'lazy'}
				{routePrefix}
			/>
		{/each}
	</div>
{/snippet}

{#snippet results()}
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
{/snippet}

<Seo
	title={labels.metaTitle}
	description={labels.metaDescription}
	ogImage="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp"
	ogImageAlt={labels.metaAlt}
	lang={isEnglish ? 'en' : 'de'}
/>
<svelte:head>
	{#if heroRecipe}
		<link rel="preload" as="image" href="https://bocken.org/static/rezepte/full/{heroImg}" fetchpriority="high" />
	{/if}
</svelte:head>

{#if heroRecipe}
	<section class="hero-section">
		<div class="hero-layer">
			<figure class="hero" style:background-color={heroColor}>
				<img
					class="hero-img"
					src="https://bocken.org/static/rezepte/full/{heroImg}"
					alt=""
					loading="eager"
					fetchpriority="high"
					data-recipe={heroRecipe.short_name}
				/>
				<div class="hero-overlay"></div>
			</figure>
		</div>

		<div class="hero-scroll-content">
			<div class="hero-text">
				<h1>{labels.title}</h1>
				<p class="subheading">{labels.subheading}</p>
				<a href={resolve('/[recipeLang=recipeLang]/[name]', { recipeLang: data.recipeLang, name: heroRecipe.short_name })} class="hero-featured"
				onclick={() => {
					const img = document.querySelector('.hero-img') as HTMLElement | null;
					if (img) (img.style as any).viewTransitionName = `recipe-${heroRecipe.short_name}-img`;
				}}>
					<span class="recipe-name"><span class="recipe-icon">{heroRecipe.icon}</span> {@html heroRecipe.name}</span>
					<svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" viewBox="-10 -197 535 410"><path d="M503 31c12-13 12-33 0-46L343-175c-13-12-33-12-46 0-12 13-12 33 0 46L403-24H32C14-24 0-10 0 8s14 32 32 32h371L297 145c-12 13-12 33 0 46 13 12 33 12 46 0L503 31z"/></svg>
				</a>
			</div>

			<div class="below-hero">
				<div class="hero-search-wrap">
					{@render searchField()}
				</div>

				<div class="browse">
					<div class="rail-column">
						<RecipeFilterRail {browse} {lang} isLoggedIn={!!data.session?.user} bind:open={filtersOpen} />
					</div>
					<div>
						{@render results()}
					</div>
				</div>
			</div>
		</div>
	</section>
	{#if !isEnglish}
		<AddButton href={resolve('/rezepte/add')}></AddButton>
	{/if}
{:else}
	<div class="hero-fallback">
		<h1>{labels.title}</h1>
		<p class="subheading">{labels.subheading}</p>
	</div>
	<div class="hero-search-wrap">
		{@render searchField()}
	</div>

	<div class="browse">
		<div class="rail-column">
			<RecipeFilterRail {browse} {lang} isLoggedIn={!!data.session?.user} bind:open={filtersOpen} />
		</div>
		<div>
			{@render results()}
		</div>
	</div>

	{#if !isEnglish}
		<AddButton href={resolve('/rezepte/add')}></AddButton>
	{/if}
{/if}

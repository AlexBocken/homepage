<script lang="ts">
	import type { PageData } from './$types';
	import AddButton from '$lib/components/AddButton.svelte';
	import CompactCard from '$lib/components/recipes/CompactCard.svelte';
	import Search from '$lib/components/recipes/Search.svelte';
	import { getCategories } from '$lib/js/categories';

	let { data } = $props<{ data: PageData }>();
	let current_month = new Date().getMonth() + 1;

	// Search state
	let matchedRecipeIds = $state(new Set());
	let matchedCategories = $state(new Set());
	let hasActiveSearch = $state(false);

	function handleSearchResults(ids, categories) {
		matchedRecipeIds = ids;
		matchedCategories = categories || new Set();
		hasActiveSearch = ids.size < data.all_brief.length;
	}

	const isEnglish = $derived(data.lang === 'en');
	const categories = $derived(getCategories(data.lang));

	// Pick a seasonal hero recipe (changes daily) — only recipes with hashed images
	// Only recipes with hashed images (e.g. myrecipe.a1b2c3d4.webp)
	const hasHashedImage = (r) => r.images?.length > 0 && /\.\w+\.\w+$/.test(r.images[0].mediapath);

	// Server-generated random index ensures SSR and client pick the same hero
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

	// Category chip state: 'all', 'season', or a category name
	let activeChip = $state('all');
	let chipsExpanded = $state(false);

	// Incremental rendering
	const BATCH_SIZE = 24;
	let visibleCount = $state(BATCH_SIZE);
	let sentinel = $state<HTMLElement | null>(null);

	// Reset visible count when chip or search changes
	$effect(() => {
		// Track dependencies
		activeChip;
		hasActiveSearch;
		matchedRecipeIds;
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

	// Pre-compute category-to-recipes Map
	const recipesByCategory = $derived.by(() => {
		const map = new Map<string, typeof data.all_brief>();
		for (const recipe of data.all_brief) {
			if (!map.has(recipe.category)) {
				map.set(recipe.category, []);
			}
			map.get(recipe.category)!.push(recipe);
		}
		return map;
	});

	// Category counts (unfiltered, for chip badges)
	const categoryCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const [cat, recipes] of recipesByCategory) {
			counts.set(cat, recipes.length);
		}
		return counts;
	});

	// Filtered recipes for the active view
	const displayRecipes = $derived.by(() => {
		let pool: typeof data.all_brief;

		if (activeChip === 'all') {
			pool = data.all_brief;
		} else if (activeChip === 'season') {
			pool = data.season;
		} else {
			pool = recipesByCategory.get(activeChip) || [];
		}

		if (hasActiveSearch) {
			pool = pool.filter(r => matchedRecipeIds.has(r._id));
		}

		return pool;
	});

	// Sliced for incremental rendering
	const visibleRecipes = $derived(displayRecipes.slice(0, visibleCount));
	const hasMore = $derived(visibleCount < displayRecipes.length);

	const labels = $derived({
		title: isEnglish ? 'Recipes' : 'Rezepte',
		subheading: isEnglish
			? `${data.all_brief.length} recipes and constantly growing...`
			: `${data.all_brief.length} Rezepte und stetig wachsend...`,
		all: isEnglish ? 'All' : 'Alle',
		inSeason: isEnglish ? 'In Season' : 'In Saison',
		metaTitle: isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte',
		metaDescription: isEnglish
			? "A constantly growing collection of recipes from Bocken's kitchen."
			: "Eine stetig wachsende Ansammlung an Rezepten aus der Bockenschen Küche.",
		metaAlt: isEnglish ? 'Pasta al Ragu with Linguine' : 'Pasta al Ragu mit Linguine'
	});
</script>
<style>
/* ─── Hero parallax (same scaleY technique as TitleImgParallax) ─── */
.hero-section {
	--parallax-scale: 0.3;
	margin-bottom: -20vh;
	transform-origin: center top;
	transform: translateY(-1rem) scaleY(calc(1 - var(--parallax-scale)));
}
@media (prefers-reduced-motion) {
	.hero-section {
		--parallax-scale: 0;
		margin-bottom: 0;
	}
}
.hero-section > * {
	transform-origin: center top;
	transform: scaleY(calc(1 / (1 - var(--parallax-scale))));
}

/* Sticky image — stays at top while content scrolls over it */
.hero {
	position: sticky;
	top: 0;
	height: min(60vh, 520px);
	overflow: hidden;
	max-width: 1200px;
	margin: 0 auto;
	z-index: -1;
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

/* ─── Scrollable content that moves over the sticky hero ─── */
.hero-scroll-content {
	position: relative;
	margin: -20vh auto 0;
	transition: margin-top 0.25s ease;
}
.hero-scroll-content.chips-open {
	margin-top: -25vh;
}

/* Title area: overlaps the lower portion of the hero */
.hero-text {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 2em 3.5em;
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
.hero-featured .arrow-icon {
	width: 0.7em;
	height: 0.7em;
	fill: currentColor;
}

/* ─── Category chip bar ─── */
.chip-wrap {
	display: flex;
	gap: 0.5em;
	align-items: flex-start;
	margin: 0.8em 0 0;
}
.chip-bar {
	display: flex;
	gap: 0.5em;
	padding: 0.5em 0;
	flex-wrap: wrap;
	flex: 1;
	min-width: 0;
}
/* On small screens, collapse to single row */
@media (max-width: 600px) {
	.chip-bar:not(.expanded) {
		max-height: 2.4em;
		overflow: hidden;
	}
}
.chip {
	white-space: nowrap;
	padding: 0.35em 0.9em;
	font-size: 0.85rem;
	font-weight: 500;
	background: rgba(255,255,255,0.85);
	color: var(--nord0);
	flex-shrink: 0;
}
.chip:hover {
	background: white;
	transform: scale(1.04);
}
.chip.active {
	background: var(--color-primary);
	color: white;
}
.chip.season {
	background: var(--color-secondary);
	color: white;
}
.chip .count {
	font-size: 0.8em;
	opacity: 0.7;
	margin-left: 0.25em;
}
/* Ellipsis button — outside chip-bar overflow, always visible */
.chip-more {
	background: rgba(255,255,255,0.5);
	font-weight: 700;
	letter-spacing: 0.1em;
	flex-shrink: 0;
	margin-top: 0.5em;
}
@media (min-width: 601px) {
	.chip-more {
		display: none;
	}
}

/* ─── Content below the hero (grid, etc.) ─── */
.below-hero {
	background: var(--color-bg-primary);
	padding-top: 2.5em;
	overflow: visible;
}

/* ─── Search bar — anchored to top of below-hero, straddles the boundary ─── */
.hero-search-wrap {
	max-width: 1200px;
	margin: -4em auto 0;
	padding: 0 2em;
	position: relative;
	z-index: 10;
}

/* ─── Recipe grid ─── */
.recipe-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 1.5em;
	padding: 0 1.5em;
	max-width: 1400px;
	margin: 0 auto 2em;
}
@media (min-width: 600px) {
	.recipe-grid {
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	}
}
@media (min-width: 1024px) {
	.recipe-grid {
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1.8em;
	}
}

.sentinel {
	height: 1px;
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

<svelte:head>
	<title>{labels.metaTitle}</title>
	<meta name="description" content="{labels.metaDescription}" />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="{labels.metaAlt}" />
</svelte:head>

{#if heroRecipe}
	<section class="hero-section">
		<figure class="hero">
			<img
				class="hero-img"
				src="https://bocken.org/static/rezepte/full/{heroImg}"
				alt=""
				loading="eager"
			/>
			<div class="hero-overlay"></div>
		</figure>

		<div class="hero-scroll-content" class:chips-open={chipsExpanded}>
			<div class="hero-text">
				<h1>{labels.title}</h1>
				<p class="subheading">{labels.subheading}</p>
				<a href="/{data.recipeLang}/{heroRecipe.short_name}" class="hero-featured">
					<span class="recipe-name">{heroRecipe.icon} {@html heroRecipe.name}</span>
					<svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" viewBox="-10 -197 535 410"><path d="M503 31c12-13 12-33 0-46L343-175c-13-12-33-12-46 0-12 13-12 33 0 46L403-24H32C14-24 0-10 0 8s14 32 32 32h371L297 145c-12 13-12 33 0 46 13 12 33 12 46 0L503 31z"/></svg>
				</a>

				<div class="chip-wrap">
					<div class="chip-bar" class:expanded={chipsExpanded}>
						<button
							class="chip g-pill"
							class:active={activeChip === 'all'}
							onclick={() => activeChip = 'all'}
						>
							{labels.all}
							<span class="count">({data.all_brief.length})</span>
						</button>

						{#if data.season.length > 0}
							<button
								class="chip g-pill"
								class:season={activeChip === 'season'}
								class:active={activeChip === 'season'}
								onclick={() => activeChip = 'season'}
							>
								{labels.inSeason}
								<span class="count">({data.season.length})</span>
							</button>
						{/if}

						{#each categories as cat (cat)}
							{@const count = categoryCounts.get(cat) || 0}
							{#if count > 0}
								<button
									class="chip g-pill"
									class:active={activeChip === cat}
									onclick={() => activeChip = cat}
								>
									{cat}
									<span class="count">({count})</span>
								</button>
							{/if}
						{/each}
					</div>
					<button
						class="chip chip-more g-pill"
						onclick={() => chipsExpanded = !chipsExpanded}
					>
						{chipsExpanded ? '\u2715' : '\u2026'}
					</button>
				</div>

			</div>

			<div class="below-hero">
				<div class="hero-search-wrap">
					<Search lang={data.lang} recipes={data.all_brief} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}></Search>
				</div>
				<div class="recipe-grid">
					{#each visibleRecipes as recipe, i (recipe._id)}
						<CompactCard
							{recipe}
							{current_month}
							isFavorite={recipe.isFavorite}
							showFavoriteIndicator={!!data.session?.user}
							loading_strat={i < 12 ? "eager" : "lazy"}
							routePrefix="/{data.recipeLang}"
						/>
					{/each}
				</div>

				{#if hasMore}
					<div class="sentinel" bind:this={sentinel}></div>
				{/if}

			</div>
		</div>
	</section>
	{#if !isEnglish}
		<AddButton href="/rezepte/add"></AddButton>
	{/if}
{:else}
	<div class="hero-fallback">
		<h1>{labels.title}</h1>
		<p class="subheading">{labels.subheading}</p>
	</div>
	<Search lang={data.lang} recipes={data.all_brief} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}></Search>

	<div class="recipe-grid">
		{#each visibleRecipes as recipe, i (recipe._id)}
			<CompactCard
				{recipe}
				{current_month}
				isFavorite={recipe.isFavorite}
				showFavoriteIndicator={!!data.session?.user}
				loading_strat={i < 12 ? "eager" : "lazy"}
				routePrefix="/{data.recipeLang}"
			/>
		{/each}
	</div>

	{#if hasMore}
		<div class="sentinel" bind:this={sentinel}></div>
	{/if}

	{#if !isEnglish}
		<AddButton href="/rezepte/add"></AddButton>
	{/if}
{/if}

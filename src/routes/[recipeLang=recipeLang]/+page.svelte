<script lang="ts">
	import { resolve } from '$app/paths';
	import { replaceState } from '$app/navigation';
	import { createRouterReady } from '$lib/js/routerReady.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import AddButton from '$lib/components/AddButton.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
	import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
	import { createRecipeBrowse } from '$lib/js/recipeBrowse.svelte';
	import { applyParamsToBrowse, browseToParams, hasBrowseParams } from '$lib/js/browseParams';
	import { recallFilters, rememberFilters } from '$lib/js/filterMemory';
	import { m, type RecipesLang } from '$lib/js/recipesI18n';

	let { data } = $props<{ data: PageData }>();
	const lang = $derived(data.lang as RecipesLang);
	const t = $derived(m[lang]);

	const isEnglish = $derived(lang === 'en');

	const browse = createRecipeBrowse(() => data.all_brief);

	// Filters carried between visits, per tab and per language — the category and
	// keyword values are the translated ones, so a German filter set would filter the
	// English listing down to nothing.
	const memoryKey = $derived(`recipes:listing:${lang}`);

	// Deep links from elsewhere on the site (`?q=`, `?category=`, `?tag=`, and the
	// nutrition filter) land pre-filtered. Applied at init rather than in an effect, so
	// the server renders the filtered grid: effects do not run there, and a URL the
	// rail wrote would otherwise show the whole collection to anyone without
	// JavaScript — and flash it to everyone else.
	// svelte-ignore state_referenced_locally
	applyParamsToBrowse(browse, page.url.searchParams);

	// Arriving with no filters at all — the nav link — reopens the ones from a few
	// minutes ago instead. That is the case the URL cannot carry, because you left
	// this page by following a link, and it needs the browser: sessionStorage exists
	// only on the client, so unlike the deep link above this has to wait for an effect.
	let urlApplied = $state(false);
	$effect(() => {
		if (urlApplied || typeof window === 'undefined') return;
		if (!hasBrowseParams(page.url.searchParams)) {
			const remembered = recallFilters(memoryKey);
			if (remembered) applyParamsToBrowse(browse, new URLSearchParams(remembered));
		}
		urlApplied = true;
	});

	// Keep the address bar in step so a filtered listing is shareable, and keep the
	// remembered set in step with it so the two can never disagree.
	// `replaceState` rather than `goto`: toggling four keywords should not leave
	// four back-button stops.
	// Waits for the router too, which replaceState needs.
	const router = createRouterReady();
	$effect(() => {
		if (!urlApplied || !router.ready || typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		const next = browseToParams(browse).toString();
		// Written on every change rather than on the way out: there is no reliable
		// "leaving" event for a link click, and this keeps the idle clock measuring
		// time since the filters were last touched, which is what it is for.
		rememberFilters(memoryKey, next);
		if (next === url.searchParams.toString()) return;
		url.search = next;
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
	// Blurred stand-in for the hero photo — see $lib/server/lqip.
	const heroBlur = $derived(
		heroRecipe ? (heroRecipe.images[0].blur || '') : ''
	);

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
	background-color: var(--color-bg-elevated);
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
	/* Placeholder + dither on the <img> itself, because this element carries
	   `view-transition-name` into the detail-page morph — on the figure it would
	   stay behind while the photo flies. `background-position` mirrors
	   `object-position` so the two crop from the same anchor. */
	background-image: var(--lqip-grain), var(--lqip, none);
	background-size: 96px 96px, cover;
	background-position: center, 50% 30%;
	background-repeat: repeat, no-repeat;
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
			<figure class="hero">
				<img
					class="hero-img"
					style:--lqip={heroBlur ? `url("${heroBlur}")` : null}
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
				<RecipeSearchField {browse} {lang} recipeLang={data.recipeLang} hero={true} />
				<RecipeBrowse
					facetPath={page.url.pathname}
					{browse}
					{lang}
					recipeLang={data.recipeLang}
					isLoggedIn={!!data.session?.user}
				/>
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
	<RecipeSearchField {browse} {lang} recipeLang={data.recipeLang} />
	<RecipeBrowse
		facetPath={page.url.pathname}
		{browse}
		{lang}
		recipeLang={data.recipeLang}
		isLoggedIn={!!data.session?.user}
	/>

	{#if !isEnglish}
		<AddButton href={resolve('/rezepte/add')}></AddButton>
	{/if}
{/if}

<script lang="ts">
	import { writable } from 'svelte/store';
	export const multiplier = writable(0);

	import type { PageData } from './$types';
	import EditButton from '$lib/components/EditButton.svelte';
	import InstructionsPage from '$lib/components/recipes/InstructionsPage.svelte';
	import IngredientsPage from '$lib/components/recipes/IngredientsPage.svelte';
	import TitleImgParallax from '$lib/components/recipes/TitleImgParallax.svelte';
	import { afterNavigate } from '$app/navigation';
    	import {season} from '$lib/js/season_store';
	import RecipeNote from '$lib/components/recipes/RecipeNote.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import { onDestroy } from 'svelte';
	import { recipeTranslationStore } from '$lib/stores/recipeTranslation';

    	let { data } = $props<{ data: PageData }>();

	// Set store for recipe translation data so UserHeader can access it
	// Use $effect instead of onMount to react to data changes during client-side navigation
	$effect(() => {
		recipeTranslationStore.set({
			germanShortName: data.germanShortName || data.short_name,
			englishShortName: data.englishShortName,
			hasEnglishTranslation: data.hasEnglishTranslation || false
		});
	});

	// Clear store when leaving recipe page
	onDestroy(() => {
		recipeTranslationStore.set(null);
	});

	const isEnglish = $derived(data.lang === 'en');

	// Use mediapath from images array (includes hash for cache busting)
	// Fallback to short_name.webp for backward compatibility
	const img_filename = $derived(
		data.images?.[0]?.mediapath ||
		`${data.germanShortName || data.short_name}.webp`
	);
	const hero_img_src = $derived("https://bocken.org/static/rezepte/full/" + img_filename);
	const placeholder_src = $derived("https://bocken.org/static/rezepte/placeholder/" + img_filename);

	// Get alt text from images array
	const img_alt = $derived(data.images?.[0]?.alt || '');

    	const months = $derived(isEnglish
		? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
		: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]);

	function season_intervals() {
		// Guard against missing season data (can happen in offline mode)
		if (!data.season || !Array.isArray(data.season) || data.season.length === 0) {
			return [];
		}

		let interval_arr = []

		let start_i = 0
		for(var i = 12; i > 0; i--){
			if(data.season.includes(i)){
				start_i = data.season.indexOf(i);
			}
			else{
				break
			}
		}

		var start = data.season[start_i]
		var end_i
		const len = data.season.length
		for(var i = 0; i < len -1; i++){
			if(data.season.includes((start + i) %12 + 1)){
				end_i = (start_i + i + 1) % len
			}
			else{
	  			interval_arr.push([start, data.season[end_i]])
				start = data.season[(start + i + 1) % len]
			}

		}
		if(interval_arr.length == 0){
	  		interval_arr.push([start, data.season[end_i]])
		}

		return interval_arr
	}
	const season_iv = $derived(season_intervals());

	const display_date = $derived(data.updatedAt ? new Date(data.updatedAt) : new Date(data.dateCreated));
	const options = {
 	 day: '2-digit',
 	 month: 'short',
 	 year: 'numeric',
 	 hour: '2-digit',
 	 minute: '2-digit',
	};
	const formatted_display_date = $derived(display_date.toLocaleDateString(isEnglish ? 'en-US' : 'de-DE', options));

	const labels = $derived({
		season: isEnglish ? 'Season:' : 'Saison:',
		keywords: isEnglish ? 'Keywords:' : 'Stichwörter:',
		lastModified: isEnglish ? 'Last modified:' : 'Letzte Änderung:',
		title: isEnglish ? "Bocken Recipes" : "Bocken'sche Rezepte"
	});
</script>
<style>
h1{
	text-align: center;
	padding-block: 0.5em;
	border-radius: 10000px;
	margin:0;
	font-size: 3rem;
	overflow-wrap: break-word;
	hyphens: auto;
	text-wrap: balance;
}
/* Position overrides for global classes */
.category{
	--size: 1.75rem;
	position: absolute;
	top: calc(-1* var(--size));
	left: calc(-3/2 * var(--size));
	font-size: var(--size);
	padding: calc(var(--size) * 2/3);
}
.category:hover,
.category:focus-visible{
	scale: 1.1;
}
.tags{
	margin-block: 1rem;
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: 1em;
	font-size: 1.1rem;
}
.tags h2,
h2.section-label{
	font-size: 1.2rem;
	font-weight: bold;
}
.center{
	justify-content: center;
}

.wrapper_wrapper{
	--bg-color: #fbf9f3;
	display: grid;
	grid-template-columns: 1fr 2fr;
	max-width: 1000px;
	margin-inline: auto;
	padding-top: 10rem;
	margin-bottom: 3rem;
	transform: translateY(-7rem);
	z-index: -2;
	position: relative;
}
.wrapper_wrapper::before {
	content: '';
	position: absolute;
	inset: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 100vw;
	background-color: var(--bg-color);
	z-index: -1;
}
.addendum, .date {
	grid-column: 1 / -1;
	justify-self: center;
}
@media (prefers-color-scheme: dark) {
	.wrapper_wrapper{
		--bg-color: var(--background-dark);
	}
}
@media screen and (max-width: 700px){
	.wrapper_wrapper{
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.wrapper_wrapper > :global(.ingredients),
	.wrapper_wrapper > :global(.instructions) {
		width: 100%;
	}
}
.title{
	position: relative;
	width: min(800px, 80vw);
	margin-inline: auto;
	background-color: var(--nord6);
	padding: 1rem 2rem;
	translate: 0 1px; /*bruh*/
	z-index: 1;
}
@media (prefers-color-scheme: dark) {
	.title{
		background-color: var(--nord6-dark);
	}
}

.icon{
	position: absolute;
	top: -1em;
	right: -0.75em;
	padding: 0.5em;
	font-size: 1.5rem;
	background-color: #FAFAFE;
}
@media (prefers-color-scheme: dark) {
	.icon{
		background-color: var(--accent-dark);
	}
}
.icon:hover,
.icon:focus-visible{
	scale: 1.2;
	animation: shake 0.5s ease forwards;
}

h2{
	margin-block: 0;
}
.addendum{
	max-width: 800px;
	justify-self: center;
	padding-inline: 2rem;
}
@media screen and (max-width: 800px){
	.title{
		width: 100%;
	}
	.icon{
		right: 1rem;
		top: -1.75rem;
	}
	.category{
		left: 1rem;
		top: calc(var(--size) * -1.5);
	}
}
@keyframes shake{
    0%{
      transform: rotate(0)
		scale(1,1);
    }
    25%{
    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(var(--angle))
      		scale(1.2,1.2)
      ;
    }
    50%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(calc(-1* var(--angle)))
      		scale(1.2,1.2);
    }
    74%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
  	transform: rotate(var(--angle))
  		scale(1.2, 1.2);
	}
	100%{
      transform: rotate(0)
      scale(1.2,1.2);
    }
  }

.description{
	text-align: center;
	margin-bottom: 2em;
	margin-top: -0.5em;
}
.date{
	margin-bottom: 0;
}

</style>
<svelte:head>
	<title>{data.strippedName} - {labels.title}</title>
	<meta name="description" content="{data.strippedDescription}" />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/{img_filename}" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/{img_filename}" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="{data.strippedName}" />
	{@html `<script type="application/ld+json">${JSON.stringify(data.recipeJsonLd)}</script>`}
	<!-- SEO: hreflang tags -->
	<link rel="alternate" hreflang="de" href="https://bocken.org/rezepte/{data.germanShortName}" />
	{#if isEnglish || data.hasEnglishTranslation}
		<link rel="alternate" hreflang="en" href="https://bocken.org/recipes/{isEnglish ? data.short_name : data.englishShortName}" />
	{/if}
	<link rel="alternate" hreflang="x-default" href="https://bocken.org/rezepte/{data.germanShortName}" />
</svelte:head>

<TitleImgParallax src={hero_img_src} {placeholder_src} alt={img_alt}>
	<div class=title>
		{#if data.category}
			<a class="category g-pill g-btn-dark" href='/{data.recipeLang}/category/{data.category}'>{data.category}</a>
		{/if}
		{#if data.icon}
			<a class="icon g-icon-badge" href='/{data.recipeLang}/icon/{data.icon}'>{data.icon}</a>
		{/if}
		<h1>{@html data.name}</h1>
		{#if data.description && ! data.preamble}
			<p class=description>{data.description}</p>
		{/if}
		{#if data.preamble}
			<p>{@html data.preamble}</p>
		{/if}
		{#if season_iv.length > 0}
			<div class=tags>
				<h2>{labels.season}</h2>
				{#each season_iv as season}
					<a class="g-tag" href="/{data.recipeLang}/season/{season[0]}">
						{#if season[0]}
							{months[season[0] - 1]}
						{/if}
						{#if season[1]}
							- {months[season[1] - 1]}
						{/if}
					</a>
				{/each}
			</div>
		{/if}
		{#if data.tags && data.tags.length > 0}
			<h2 class="section-label">{labels.keywords}</h2>
			<div class="tags center">
				{#each data.tags as tag}
					<a class="g-tag" href="/{data.recipeLang}/tag/{tag}">{tag}</a>
				{/each}
			</div>
		{/if}

		<FavoriteButton
			recipeId={data.germanShortName}
			isFavorite={data.isFavorite || false}
			isLoggedIn={!!data.session?.user}
		/>

		{#if data.note && data.note.trim()}
			<RecipeNote note={data.note}></RecipeNote>
		{/if}
</div>

<div class=wrapper_wrapper>
<IngredientsPage {data}></IngredientsPage>
<InstructionsPage {data}></InstructionsPage>
<div class=addendum>
{#if data.addendum}
	{@html data.addendum}
{/if}
</div>
	<p class=date>{labels.lastModified} {formatted_display_date}</p>
</div>
</TitleImgParallax>

<EditButton href="/rezepte/edit/{data.germanShortName}"></EditButton>

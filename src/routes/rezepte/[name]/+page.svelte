<script lang="ts">
	import { writable } from 'svelte/store';
	export const multiplier = writable(0);

	import type { PageData } from './$types';
    	import "$lib/css/nordtheme.css"
	import EditButton from '$lib/components/EditButton.svelte';
	import InstructionsPage from '$lib/components/InstructionsPage.svelte';
	import IngredientsPage from '$lib/components/IngredientsPage.svelte';
	import TitleImgParallax from '$lib/components/TitleImgParallax.svelte';
	import { afterNavigate } from '$app/navigation';
    	import {season} from '$lib/js/season_store';
	import RecipeNote from '$lib/components/RecipeNote.svelte';
	import {stripHtmlTags} from '$lib/js/stripHtmlTags';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';

    	export let data: PageData;

	let hero_img_src = "https://bocken.org/static/rezepte/full/" + data.short_name + ".webp?v=" + data.dateModified
	let placeholder_src = "https://bocken.org/static/rezepte/placeholder/" + data.short_name + ".webp?v=" + data.dateModified
    	export let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
	function season_intervals() {
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
	export let season_iv = season_intervals();

	afterNavigate(() => {
		hero_img_src = "https://bocken.org/static/rezepte/full/" + data.short_name + ".webp"
		placeholder_src = "https://bocken.org/static/rezepte/placeholder/" + data.short_name + ".webp"
		season_iv = season_intervals();
	})
	let display_date = new Date(data.dateCreated);
	if (data.updatedAt){
		display_date = new Date(data.updatedAt);
	}
	const options = {
 	 day: '2-digit',
 	 month: 'short', // German abbreviation for the month
 	 year: 'numeric',
 	 hour: '2-digit',
 	 minute: '2-digit',
	};
	const formatted_display_date = display_date.toLocaleDateString('de-DE', options)
</script>
<style>
*{
font-family: sans-serif;
}
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
.category{
	--size: 1.75rem;
	position: absolute;
	top: calc(-1* var(--size) );
	left:calc(-3/2 * var(--size));
	background-color: var(--nord0);
	color: var(--nord6);
	text-decoration: none;
	font-size: var(--size);
	padding: calc(var(--size) * 2/3);
	border-radius: 1000px;
	transition: 100ms;
	box-shadow: 0em 0em 1em 0.3em rgba(0,0,0,0.4);
}
.category:hover,
.category:focus-visible{
	background-color: var(--nord1);
	scale: 1.1;
}
.tags{
	margin-block: 1rem;
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: 1em;
}
.center{
	justify-content: center;
}
.tag{
	all:unset;
	color: var(--nord0);
	font-size: 1.1rem;
	background-color: var(--nord5);
	border-radius: 10000px;
	padding: 0.25em 1em;
	transition: 100ms;
	box-shadow: 0em 0em 0.5em 0.05em rgba(0,0,0,0.3);
}
@media (prefers-color-scheme: dark) {
	.tag{
		background-color: var(--nord0);
		color: white;
	}
}
.tag:hover,
.tag:focus-visible
{
	cursor: pointer;
	transform: scale(1.1,1.1);
	background-color: var(--orange);
	box-shadow: 0.1em 0.1em 0.5em 0.1em rgba(0,0,0,0.3);
}

.wrapper_wrapper{
	background-color: #fbf9f3;
	padding-top: 10rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 3rem;
	transform: translateY(-7rem);
	z-index: -2;
}
@media (prefers-color-scheme: dark) {
	.wrapper_wrapper{
		background-color: var(--background-dark);
	}
}

.wrapper{
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	justify-content: center;
	margin-inline: auto;
}

@media screen and (max-width: 700px){
	.wrapper{
		flex-direction:column;
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
	font-family: "Noto Color Emoji", emoji;
	position: absolute;
	top: -1em;
	right: -0.75em;
	text-decoration: unset;
	background-color: #FAFAFE;
	padding: 0.5em;
	font-size: 1.5rem;
	border-radius: 100000px;
	transition: 100ms;
	box-shadow: 0em 0em 1em 0.3em rgba(0,0,0,0.4);
}
@media (prefers-color-scheme: dark) {
	.icon{
		background-color: var(--accent-dark);
	}
}

.icon:hover,
.icon:focus-visible{
	scale: 1.2 1.2;
	animation: shake 0.5s ease forwards;
}

h4{
	margin-block: 0;
}
.addendum{
	max-width: 800px;
	margin-inline: auto;
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
	<title>{stripHtmlTags(data.name)} - Bocken'sche Rezepte</title>
	<meta name="description" content="{stripHtmlTags(data.description)}" />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/{data.short_name}.webp" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/{data.short_name}.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="{stripHtmlTags(data.name)}" />
	{@html `<script type="application/ld+json">${JSON.stringify(data.recipeJsonLd)}</script>`}
</svelte:head>

<TitleImgParallax src={hero_img_src} {placeholder_src}>
	<div class=title>
		<a class="category" href='/rezepte/category/{data.category}'>{data.category}</a>
		<a class="icon" href='/rezepte/icon/{data.icon}'>{data.icon}</a>
		<h1>{@html data.name}</h1>
		{#if data.description && ! data.preamble}
			<p class=description>{data.description}</p>
		{/if}
		{#if data.preamble}
			<p>{@html data.preamble}</p>
		{/if}
		<div class=tags>
			<h4>Saison:</h4>
			{#each season_iv as season}
				<a class=tag href="/rezepte/season/{season[0]}">
					{#if season[0]}
						{months[season[0] - 1]}
					{/if}
					{#if season[1]}
						- {months[season[1] - 1]}
					{/if}
				</a>
			{/each}
		</div>
		<h4>Stichwörter:</h4>
		<div class="tags center">
			{#each data.tags as tag}
				<a class=tag href="/rezepte/tag/{tag}">{tag}</a>
			{/each}
		</div>
		
		<FavoriteButton 
			recipeId={data.short_name} 
			isFavorite={data.isFavorite || false} 
			isLoggedIn={!!data.session?.user} 
		/>
		
		{#if data.note}
			<RecipeNote note={data.note}></RecipeNote>
		{/if}
</div>

<div class=wrapper_wrapper>
<div class=wrapper>
<IngredientsPage {data}></IngredientsPage>
<InstructionsPage {data}></InstructionsPage>
</div>
<div class=addendum>
{#if data.addendum}
	{@html data.addendum}
{/if}
</div>
	<p class=date>Letzte Änderung: {formatted_display_date}</p>
</div>
</TitleImgParallax>

<EditButton href="/rezepte/edit/{data.short_name}"></EditButton>

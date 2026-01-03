<script lang="ts">
import "$lib/css/nordtheme.css";
import "$lib/css/shake.css";
import "$lib/css/icon.css";
import { onMount } from "svelte";

let {
	recipe,
	current_month: currentMonthProp = 0,
	icon_override = false,
	search = true,
	do_margin_right = false,
	isFavorite = false,
	showFavoriteIndicator = false,
	loading_strat = "lazy",
	routePrefix = '/rezepte',
	translationStatus = undefined
} = $props();

// Make current_month reactive based on icon_override
let current_month = $derived(icon_override ? recipe.season[0] : currentMonthProp);

let isloaded = $state(false);

onMount(() => {
	isloaded = document.querySelector("img")?.complete ? true : false
});

// Use mediapath from images array (includes hash for cache busting)
// Fallback to short_name.webp for backward compatibility
const img_name = $derived(
	recipe.images?.[0]?.mediapath ||
	`${recipe.germanShortName || recipe.short_name}.webp`
);
</script>
<style>
.card_anchor{
	border-radius: 20px;
	cursor: pointer;
	display: inline-block;
	text-decoration: none;
	color: inherit;
}
.card-main-link {
	position: absolute;
	inset: 0;
	z-index: 1;
	text-decoration: none;
}
.card-main-link .visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0,0,0,0);
	white-space: nowrap;
	border: 0;
}
.card{
	--card-width: 300px;
	position: relative;
	flex-shrink: 0;
	transition: 200ms;
	text-decoration: none;
	box-sizing: border-box;
	font-family: sans-serif;
	cursor: pointer;
	height: 525px;
	width: 300px;
	border-radius: 20px;
	background-size: contain;
	display: flex;
	flex-direction: column;
	justify-content: end;
	background-color:  var(--blue);
	box-shadow: 0em 0em 2em 0.1em rgba(0, 0, 0, 0.3);
}
.icon{
	font-family: "Noto Color Emoji", emoji, sans-serif;
	border: none;
	background: none;
	cursor: pointer;
	position: absolute;
	top: -25px;
	right: -25px;
	width: 50px;
	height: 50px;
	border-radius: 50%;
	background-color: var(--nord0);
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.5em;
	box-shadow: 0em 0em 1em 0.1em rgba(0, 0, 0, 0.6);
	transition: 100ms;
	z-index: 5;
	text-decoration: none;
}
.image{
	width: 300px;
	height: 255px;
	object-fit: cover;
	transition: 200ms;
}
.blur{
	filter: blur(10px);
}
.backdrop_blur{
	backdrop-filter: blur(10px);
}
.div_image,
.div_div_image{
	width: 300px;
	background-repeat: no-repeat;
	background-size: cover;
	background-position: center;
	overflow: hidden;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}
.div_div_image{
	height: 255px;
	position: absolute;
	width: 300px;
	top: 0;
}

.card:hover,
.card:focus-within{
	transform: scale(1.02,1.02);
	background-color: var(--red);
	box-shadow: 0.2em 0.2em 2em 1em rgba(0, 0, 0, 0.3);
}
.card:focus{
	scale: 0.95 0.95;
}
.card_title {
	position: absolute;
	padding-top: 0.5em;
	height: 262.5px;
	width: 300px;
	top: 262.5px;
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	transition: 100ms;
}
.name{
	font-size: 2em;
	color: white;
	padding-inline: 0.5em;
	padding-block: 0.2em;
}
.description{
	padding-inline: 1em;
	color: var(--nord4);
}
.tags{
	display: flex;
	flex-wrap: wrap-reverse;
	overflow: hidden;
	column-gap: 0.25em;
	padding-inline: 0.5em;
	padding-top: 0.25em;
	margin-bottom:0.5em;
	flex-grow: 0;
}
.tag{
	cursor: pointer;
	text-decoration: none;
	background-color: var(--nord4);
	color: var(--nord0);
	border-radius: 100px;
	padding-inline: 1em;
	line-height: 1.5em;
	margin-bottom: 0.5em;
	transition: 100ms;
	box-shadow: 0em 0em 0.2em 0.05em rgba(0, 0, 0, 0.3);
	border: none;
	position: relative;
	z-index: 2;
	display: inline-block;
}
.tag:hover,
.tag:focus-visible
{
	transform: scale(1.04, 1.04);
	background-color: var(--orange);
	box-shadow: 0.2em 0.2em 0.2em 0.1em rgba(0, 0, 0, 0.3);
}
.tag:focus{
	transition: 100ms;
	scale: 0.9;
}
.card_title .category{
	position: absolute;
	box-shadow: 0em 0em 1em 0.1em rgba(0, 0, 0, 0.6);
	text-decoration: none;
	color: var(--nord6);
	font-size: 1.5rem;
	top: -0.8em;
	left: -0.5em;
	background-color: var(--nord0);
	padding-inline: 1em;
	border-radius: 1000px;
	transition: 100ms;
	border: none;
	cursor: pointer;
	z-index: 2;
	display: inline-block;
}
.card_title .category:hover,
.card_title .category:focus-within
{
	box-shadow: -0.2em 0.2em 1em 0.1em rgba(0, 0, 0, 0.6);
	background-color: var(--nord3);
	transform: scale(1.05, 1.05)
}
.category:focus{
	scale: 0.9 0.9;
}

.favorite-indicator{
	position: absolute;
	font-size: 2rem;
	top: 0.1em;
	left: 0.1em;
	filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.8));
}

.translation-badge{
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	padding: 0.4rem 0.8rem;
	border-radius: 4px;
	font-size: 0.75rem;
	font-weight: 600;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	z-index: 3;
	color: var(--nord0);
}

.translation-badge.none{
	background-color: var(--nord14);
}

.translation-badge.pending{
	background-color: var(--nord13);
}

.translation-badge.needs_update{
	background-color: var(--nord12);
}

.icon:hover,
.icon:focus-visible
{
	transform: scale(1.1, 1.1);
	background-color: var(--nord3);
	box-shadow: 0.2em 0.2em 1em 0.1em rgba(0, 0, 0, 0.8);
}

.icon:focus {
	transform: scale(0.9, 0.9);
}

.card:hover .icon,
.card:focus-visible .icon
{
	animation: shake 0.6s;
}
.margin_right{
	margin-right: 2em;
}
</style>

<div class=card_anchor class:search_me={search} data-tags="[{recipe.tags}]">
<div class="card" class:margin_right={do_margin_right}>
	<a href="{routePrefix}/{recipe.short_name}" class="card-main-link" aria-label="View recipe: {recipe.name}">
		<span class="visually-hidden">View recipe: {recipe.name}</span>
	</a>
	<div class=div_div_image >
		<div class=div_image style="background-image:url(https://bocken.org/static/rezepte/placeholder/{img_name})">
			<noscript>
				<img class="image backdrop_blur" src="https://bocken.org/static/rezepte/thumb/{img_name}" loading={loading_strat} alt="{recipe.alt}"/>
			</noscript>
			<img class="image backdrop_blur" class:blur={!isloaded} src={'https://bocken.org/static/rezepte/thumb/' + img_name} loading={loading_strat} alt="{recipe.alt}" on:load={() => isloaded=true}/>
		</div>
	</div>
	{#if showFavoriteIndicator && isFavorite}
		<div class="favorite-indicator">❤️</div>
	{/if}
	{#if translationStatus !== undefined}
		<div class="translation-badge {translationStatus || 'none'}">
			{#if translationStatus === 'pending'}
				Freigabe ausstehend
			{:else if translationStatus === 'needs_update'}
				Aktualisierung erforderlich
			{:else}
				Keine Übersetzung
			{/if}
		</div>
	{/if}
	{#if icon_override || recipe.season.includes(current_month)}
		<a href="{routePrefix}/icon/{recipe.icon}" class=icon>{recipe.icon}</a>
	{/if}
	<div class="card_title">
		<a href="{routePrefix}/category/{recipe.category}" class=category>{recipe.category}</a>
		<div>
			<div class=name>{@html recipe.name}</div>
			<div class=description>{@html recipe.description}</div>
		</div>
		<div class=tags>
		{#each recipe.tags as tag}
			<a href="{routePrefix}/tag/{tag}" class=tag>{tag}</a>
		{/each}
		</div>
	</div>
</div>
</div>

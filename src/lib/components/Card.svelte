<script lang="ts">
export let recipe
export let current_month
export let icon_override = false;
export let search = true;
import "$lib/css/nordtheme.css";
import "$lib/css/shake.css";
import "$lib/css/icon.css";
export let do_margin_right = false;

if(icon_override){
	current_month = recipe.season[0]
}

let isloaded = false

import { onMount } from "svelte";

onMount(() => {
	isloaded = document.querySelector("img")?.complete ? true : false
})

const img_name=recipe.short_name + ".webp?v=" + recipe.dateModified
</script>
<style>
.card_anchor{
	border-radius: 20px;
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
#image{
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
	text-decoration: unset;
	background-color: var(--nord4);
	color: var(--nord0);
	border-radius: 100px;
	padding-inline: 1em;
	line-height: 1.5em;
	margin-bottom: 0.5em;
	transition: 100ms;
	box-shadow: 0em 0em 0.2em 0.05em rgba(0, 0, 0, 0.3);
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

.card:hover .icon,
.card:focus-visible .icon
{
	animation: shake 0.6s;
}
.margin_right{
	margin-right: 2em;
}
</style>

<a class=card_anchor href="/rezepte/{recipe.short_name}" class:search_me={search} data-tags=[{recipe.tags}] >
<div class="card" class:margin_right={do_margin_right}>
	<div class=div_div_image >
		<div class=div_image style="background-image:url(https://bocken.org/static/rezepte/placeholder/{img_name})">
			<noscript>
				<img id=image class="backdrop_blur" src="https://bocken.org/static/rezepte/thumb/{img_name}" loading=lazy  alt="{recipe.alt}"/>
			</noscript>
			<img class:blur={!isloaded} id=image class="backdrop_blur" src={'https://bocken.org/static/rezepte/thumb/' + recipe.short_name + '.webp'} loading=lazy  alt="{recipe.alt}" on:load={() => isloaded=true}/>
		</div>
	</div>
	{#if icon_override || recipe.season.includes(current_month)}
		<a class=icon href="/rezepte/icon/{recipe.icon}">{recipe.icon}</a>
	{/if}
	<div class="card_title">
		<a class=category href="/rezepte/category/{recipe.category}" >{recipe.category}</a>
		<div>
			<div class=name>{@html recipe.name}</div>
			<div class=description>{recipe.description}</div>
		</div>
		<div class=tags>
		{#each recipe.tags as tag}
			<a class=tag href="/rezepte/tag/{tag}">{tag}</a>
		{/each}
		</div>
	</div>
</div>
</a>

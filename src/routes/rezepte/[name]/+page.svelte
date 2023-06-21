<script lang="ts">
	import { writable } from 'svelte/store';
	export const multiplier = writable(0);

	import type { PageData } from './$types';
    	import "$lib/components/nordtheme.css"
    	import MultiImgWrapper from './MultiImgWrapper.svelte'
	import EditButton from '$lib/components/EditButton.svelte';
    	export let data: PageData;
    	export let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
	function season_intervals() {
		let interval_arr = []
		let start = 0
		for(var i = 0; i < data.season.length - 1; i++)
      		{
			if(Math.abs(data.season[i] - data.season[i + 1])%11 > 1){
	  			interval_arr.push([data.season[start], data.season[i]])
				start=i+1
			}
		}
		interval_arr.push([data.season[start], data.season[data.season.length -1]])
		return interval_arr
	}
	export let season_iv = season_intervals();
</script>
<style>
*{
font-family: sans-serif;
}
h1{
	text-align: center;
	padding: 0.5em 2em;
	border-radius: 10000px;
	margin:0;
	font-size: 3rem;
}
.wrapper{
	margin-inline: auto;
	max-width: 700px;
	padding-inline: 2rem;
}
.tags{
	margin-block: 1rem;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 1em;
}
.tag{
	all:unset;
	color: var(--nord0);
	font-size: 1.1rem;
	background-color: var(--nord5);
	border-radius: 10000px;
	padding: 0.25em 1em;
	transition: 100ms;
	box-shadow: 0.2em 0.2em 0.4em 0.1em rgba(0,0,0,0.3);
}
.tag:hover,
.tag:focus-visible
{
	cursor: pointer;
	transform: scale(1.1,1.1);
	background-color: var(--orange);
	box-shadow: 0.1em 0.1em 0.2em 0.2em rgba(0,0,0,0.3);
}
</style>

<div class="wrapper">
<h1>{data.name}</h1>

<MultiImgWrapper wrap={data.images.length>1} class=double>
{#each data.images as img}
	<img width=100% src="/images/{img.mediapath}" alt="{img.alt}">
	<figure>
	{#if img.caption}
		<caption>{img.caption}</caption>
	{/if}
	</figure>
{/each}
</MultiImgWrapper>

<div class=tags>
Saison:
{#each season_iv as season}
	<a class=tag href="/rezepte/season/{season[0]}">{months[season[0] - 1]}-{months[season[1] - 1]}</a>
{/each}
</div>


<div class=tags>
Stichwörter:
{#each data.tags as tag}
	<a href="/rezepte/tag/{tag}" class=tag>{tag}</a>
{/each}
</div>


{#if data.preparation}
<div>Vorbereitung: {data.preparation}</div>
{/if}


{#if data.fermentation}
	{#if data.fermentation.bulk}
		<div>Stockgare: {data.fermentation.bulk}</div>
	{/if}

	{#if data.fermentation.final}
		<div>Stückgare: {data.fermentation.final}</div>
	{/if}
{/if}

{#if data.baking}
<div>Backen: {data.baking.length} bei {data.baking.temperature} °C {data.baking.mode}</div>
{/if}

{#if data.total_time}
<div>Gesamtzeit: {data.total_time}</div>
{/if}


{#if data.ingredients}
<h2>Zutaten</h2>
{#each data.ingredients as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<ul>
	{#each list.list as item}
		<li>{item.amount} {item.unit} {@html item.name}</li>
	{/each}
</ul>
{/each}
{/if}


{#if data.instructions}
<h2>Zubereitung</h2>
{#each data.instructions as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<ol>
	{#each list.steps as step}
		<li>{@html step}</li>
	{/each}
</ol>
{/each}
{/if}
{#if data.addendum}
	{@html data.addendum}
{/if}
</div>
<EditButton href="/rezepte/edit/{data.short_name}"></EditButton>

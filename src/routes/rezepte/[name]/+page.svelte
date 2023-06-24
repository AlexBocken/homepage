<script lang="ts">
	import { writable } from 'svelte/store';
	export const multiplier = writable(0);

	import type { PageData } from './$types';
    	import "$lib/components/nordtheme.css"
    	import MultiImgWrapper from './MultiImgWrapper.svelte'
	import EditButton from '$lib/components/EditButton.svelte';
	import InstructionsPage from '$lib/components/InstructionsPage.svelte';
	import IngredientsPage from '$lib/components/IngredientsPage.svelte';
    	export let data: PageData;
	let hero_img_src = "/images/" + data.images[0].mediapath
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
}
.tags{
	margin-block: 1rem;
	display: flex;
	flex-direction: row;
	align-items: center;
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

.title_container{
	max-width: 1000px;
	display: flex;
	flex-direction: column;
	margin-inline: auto;
}
.title{
	position: relative;
	width: min(800px, 80vw);
	margin-inline: auto;
	transform: translateY(-4rem);
	background-color: var(--nord6);
	padding: 1rem 2rem;
}
.title_container .img{
	width: 100%;
	height: 700px;
	background-size: cover;
	background-repeat: no-repeat;
	background-position: center;
}
.icon{
	position: absolute;
	top: -1em;
	right: -0.75em;
	text-decoration: unset;
	background-color: #FAFAFE;
	padding: 0.5em;
	font-size: 1.5rem;
	border-radius: 100000px;
	transition: 100ms;
	box-shadow: 0em 0em 1em 0.5em rgba(0,0,0,0.5);
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

</style>


<!--<MultiImgWrapper wrap={data.images.length>1} class=double>
{#each data.images as img}
	<img width=100% src="/images/{img.mediapath}" alt="{img.alt}">
	<figure>
	{#if img.caption}
		<caption>{img.caption}</caption>
	{/if}
	</figure>
{/each}
</MultiImgWrapper>-->


<div class=title_container>
<div class=img style="background-image: url({hero_img_src})"></div>
<div class=title>
<a class="icon" href='/rezepte/season/{data.season[0]}'>{data.icon}</a>
<h1>{data.name}</h1>
{#if data.preamble}
	<p>{data.preamble}</p>
{/if}
<div class=tags>
<h4>Saison:</h4>
{#each season_iv as season}
	<a class=tag href="/rezepte/season/{season[0]}">{months[season[0] - 1]}-{months[season[1] - 1]}</a>
{/each}
</div>


<h4>Stichwörter:</h4>
<div class=tags>
{#each data.tags as tag}
	<a href="/rezepte/tag/{tag}" class=tag>{tag}</a>
{/each}
</div>

</div>
</div>

<div class=wrapper>
<IngredientsPage {data}></IngredientsPage>
<InstructionsPage {data}></InstructionsPage>
</div>
<div class=addendum>
{#if data.addendum}
	{@html data.addendum}
{/if}
</div>
<EditButton href="/rezepte/edit/{data.short_name}"></EditButton>

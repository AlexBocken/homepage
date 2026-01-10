<script lang='ts'>
	import Check from '$lib/assets/icons/Check.svelte';
	import Cross from '$lib/assets/icons/Cross.svelte';
	import SeasonSelect from '$lib/components/SeasonSelect.svelte';
	import '$lib/css/action_button.css'
	import '$lib/css/nordtheme.css'
	import '$lib/css/shake.css'
	import { redirect } from '@sveltejs/kit';
	import { RecipeModelType } from '../../types/types';
	import type { PageData } from './$types';
	import CardAdd from '$lib/components/CardAdd.svelte';
	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/CreateStepList.svelte';

	let {
		data,
		actions,
		title,
		card_data = $bindable({
			icon: data.icon,
			category: data.category,
			name: data.name,
			description: data.description,
			tags: data.tags,
		}),
		add_info = $bindable({
			preparation: data.preparation,
			fermentation: {
				bulk: data.fermentation.bulk,
				final: data.fermentation.final,
			},
			baking: {
				length: data.baking.length,
				temperature: data.baking.temperature,
				mode: data.baking.mode,
			},
			total_time: data.total_time,
		}),
		portions = $bindable(data.portions),
		ingredients = $bindable(data.ingredients),
		instructions = $bindable(data.instructions)
	}: {
		data: PageData,
		actions: [String],
		title: string,
		card_data?: any,
		add_info?: any,
		portions?: any,
		ingredients?: any,
		instructions?: any
	} = $props();

	let preamble = $state(data.preamble);
	let addendum = $state(data.addendum);

	import { season } from '$lib/js/season_store';
	season.update(() => data.season)
	let season_local = $state();
	season.subscribe((s) => {
		season_local = s
	});

	let old_short_name = $state(data.short_name);
	let images = $state(data.images);
	let short_name = $state(data.short_name);
	let password = $state();
	let datecreated = $state(data.datecreated);
	let datemodified = $state(new Date());


	function get_season(){
		let season = []
		const el = document.getElementById("labels");
		for(var i = 0; i < el.children.length; i++){
			if(el.children[i].children[0].children[0].checked){
				season.push(i+1)
			}
		}
		return season
	}
	function write_season(season){
		const el = document.getElementById("labels");
		for(var i = 0; i < season.length; i++){
			el.children[i].children[0].children[0].checked = true
		}
	}

	async function doDelete(){
		const response = confirm("Bist du dir sicher, dass du das Rezept löschen willst?")
		if(!response){
			return
		}
		const res = await fetch('/api/delete', {
			method: 'POST',
			body: JSON.stringify({
				old_short_name,
			headers: {
       				'content-type': 'application/json',
				bearer: password,
     				}
			})

		})
	}
	async function doEdit() {
		const res = await fetch('/api/edit', {
			method: 'POST',
			body: JSON.stringify({
				: {
					...card_data,
					...add_info,
					images, // TODO
					season: season_local,
					short_name,
					datecreated,
					datemodified,
					instructions,
					ingredients,
					addendum,
					preamble
				},
				old_short_name,
			headers: {
       				'content-type': 'application/json',
				bearer: password,
     				}
			})
		})
		const item = await res.json();
	}
	async function doAdd () {
		const res = await fetch('/api/add', {
			method: 'POST',
			body: JSON.stringify({
				recipe: {
					...card_data,
					...add_info,
					images: {mediapath: short_name + '.webp', alt: "", caption: ""}, // TODO
					season: season_local,
					short_name,
					datecreated,
					datemodified,
					instructions,
					ingredients,
					preamble,
					addendum,
				},
			headers: {
       				'content-type': 'application/json',
				bearer: password,
     				}
			})
		})

	}
</script>

<style>
input{
	display: block;
	border: unset;
	margin: 1rem auto;
	padding: 0.5em 1em;
	border-radius: 1000px;
	background-color: var(--nord4);
	font-size: 1.1rem;
	transition: 100ms;

}
input:hover,
input:focus-visible
{
	scale: 1.05 1.05;
}
.list_wrapper{
	margin-inline: auto;
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	gap: 2rem;
	justify-content: center;
}
@media screen and (max-width: 700px){
	.list_wrapper{
		flex-direction: column;
	}
}
input[type=password]{
	box-sizing: border-box;
	font-size: 1.5rem;
	padding-block: 0.5em;
	display: inline;
	width: 100%;
}
.submit_wrapper{
	position: relative;
	margin-inline: auto;
	width: max(300px, 50vw)
}
.submit_wrapper button{
	position: absolute;
	right:-1em;
	bottom: -0.5em;
}
.submit_wrapper h2{
	margin-bottom: 0;
}
h1{
	text-align: center;
	margin-bottom: 2rem;
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
	margin-block: 2rem;
	margin-inline: auto;
	background-color: var(--nord6);
	background-color: red;
	padding: 1rem 2rem;
}
.title p{
	border: 2px solid var(--nord1);
	border-radius: 10000px;
	padding: 0.5em 1em;
	font-size: 1.1rem;
	transition: 200ms;
}
.title p:hover,
.title p:focus-within{
	scale: 1.02 1.02;
}
.addendum{
	font-size: 1.1rem;
	max-width: 90%;
	margin-inline: auto;
	border: 2px solid var(--nord1);
	border-radius: 45px;
	padding: 1em 1em;
	transition: 100ms;
}
.addendum:hover,
.addendum:focus-within
{
	scale: 1.02 1.02;
}
.addendum_wrapper{
	max-width: 1000px;
	margin-inline: auto;
}
h3{
	text-align: center;
}
.delete{
	position: fixed;
	right: 0;
	bottom: 0;
	margin: 2rem;
}
@media (prefers-color-scheme: dark){
	.title{
		background-color: var(--nord6-dark);
		background-color: green;
	}
}
</style>
<h1>{title}</h1>

<CardAdd {card_data}></CardAdd>

<h3>Kurzname (für URL):</h3>
<input bind:value={short_name} placeholder="Kurzname"/>

<div class=title_container>
<div class=title>
<h4>Eine etwas längere Beschreibung:</h4>
<p bind:innerText={preamble} contenteditable></p>
<div class=tags>
<h4>Saison:</h4>
<SeasonSelect></SeasonSelect>
</div>

</div>
</div>

<div class=list_wrapper>
<div>
<CreateIngredientList {ingredients} {portions}></CreateIngredientList>
</div>
<div>
<CreateStepList {instructions} {add_info}></CreateStepList>
</div>
</div>

<div class=addendum_wrapper>
<h3>Nachtrag:</h3>
<div class=addendum bind:innerText={addendum} contenteditable></div>
</div>

{#if actions.includes('add')}
<div class=submit_wrapper>
<h2>Neues Rezept hinzufügen:</h2>
<input type="password" placeholder=Passwort bind:value={password}>
<button class=action_button onclick={doAdd}><Check fill=white width=2rem height=2rem></Check></button>
</div>
{/if}
{#if actions.includes('edit')}
<div class=submit_wrapper>
<h2>Editiertes Rezept abspeichern:</h2>
<input type="password" placeholder=Passwort bind:value={password}>
<button class=action_button onclick={doEdit}><Check fill=white width=2rem height=2rem></Check></button>
</div>
{/if}

{#if actions.includes('delete')}
<div class=submit_wrapper>
<h2>Rezept löschen:</h2>
<input type="password" placeholder=Passwort bind:value={password}>
<button class=action_button onclick={doDelete}><Cross fill=white width=2rem height=2rem></Cross></button>
</div>
{/if}

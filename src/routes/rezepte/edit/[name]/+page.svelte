<script lang="ts">
    	export let data: PageData;
	let old_short_name = data.recipe.short_name

	export let card_data ={
		icon: data.recipe.icon,
		category: data.recipe.category,
		name: data.recipe.name,
		description: data.recipe.description,
		tags: data.recipe.tags,
	}
	let images = data.recipe.images
	let season = data.recipe.season

	let short_name = data.recipe.short_name
	let password
	let datecreated = data.recipe.datecreated
	let datemodified = new Date()

    	import type { PageData } from './$types';
	import CardAdd from '$lib/components/CardAdd.svelte';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';

	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	export let ingredients = data.recipe.ingredients

	import CreateStepList from '$lib/components/CreateStepList.svelte';
	export let instructions = data.recipe.instructions

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

	async function doPost () {
		const res = await fetch('/api/edit', {
			method: 'POST',
			body: JSON.stringify({
				recipe: {
					...card_data,
					images, // TODO
					season: get_season(),
					short_name,
					datecreated,
					datemodified,
					instructions,
					ingredients,
				},
				old_short_name,
			headers: {
       				'content-type': 'application/json',
				bearer: password,
     				}
			})
		})

		const json = await res.json()
		result = JSON.stringify(json)
		console.log(result)
	}


</script>

<style>
input{
	all: unset;
	display: block;
	margin: 1rem auto;
	padding: 0.2em 1em;
	border-radius: 1000px;
	background-color: var(--nord4);

}
</style>
<h1>Rezept hinzufügen</h1>

<CardAdd {card_data}></CardAdd>
<button on:click={console.log(JSON.stringify(ingredients, null, 4))}>Printout Ingredients</button>
<button on:click={console.log(JSON.stringify(instructions, null, 4))}>Printout Instructions</button>
<button on:click={console.log(JSON.stringify(card_data, null, 4))}>Prinout Card Data</button>
<input bind:value={short_name} placeholder="Kurzname"/>
<h2>Zutaten</h2>
<CreateIngredientList {ingredients}></CreateIngredientList>
<h2>Zubereitung</h2>
<CreateStepList {instructions} ></CreateStepList>
<input type="password" placeholder=Passwort bind:value={password}>
<button on:click={doPost}>EDIT RECIPE</button>

<script lang="ts">
	export let card_data ={
	}
	let short_name
	let password
	let datecreated = new Date()
	let datemodified = datecreated

	import CardAdd from '$lib/components/CardAdd.svelte';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';

	export let season = []
	import SeasonSelect from '$lib/components/SeasonSelect.svelte';

	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	export let ingredients = []

	import CreateStepList from '$lib/components/CreateStepList.svelte';
	export let instructions = []

	async function doPost () {
		const res = await fetch('/api/add', {
			method: 'POST',
			body: JSON.stringify({
				recipe: {
					season: season,
					...card_data,
					images: [{
						mediapath: short_name + '.webp',
						alt: "",
						caption: ""
					}],
					short_name,
					datecreated,
					datemodified,
					instructions,
					ingredients,
				},
			headers: {
       				'content-type': 'application/json',
				bearer: password,
     				}
			})
		})

		const json = await res.json()
		result = JSON.stringify(json)
	}
</script>
<style>
input.temp{
	all: unset;
	display: block;
	margin: 1rem auto;
	padding: 0.2em 1em;
	border-radius: 1000px;
	background-color: var(--nord4);

}
</style>

<CardAdd {card_data}></CardAdd>

<input class=temp bind:value={short_name} placeholder="Kurzname"/>

<SeasonSelect {season}></SeasonSelect>
<button on:click={() => console.log(season)}>PRINTOUT season</button>

<h2>Zutaten</h2>
<CreateIngredientList {ingredients}></CreateIngredientList>
<h2>Zubereitung</h2>
<CreateStepList {instructions} ></CreateStepList>
<input class=temp type="password" placeholder=Passwort bind:value={password}>

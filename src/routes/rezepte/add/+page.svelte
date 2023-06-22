<script lang="ts">
    	let name
	let short_name
	let category
	let icon
	let description
	let datecreated = new Date()
	let datemodified = datecreated
	let tags

    	import type { PageData } from './$types';
	import CardAdd from '$lib/components/CardAdd.svelte';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';
	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/CreateStepList.svelte';
    	export let data: PageData;
    	export let current_month = new Date().getMonth() + 1
	async function doPost () {
		const res = await fetch('/api/add', {
			method: 'POST',
			body: JSON.stringify({
				bearer: "password1234",
				recipe: {
					short_name,
					name,
					category,
					datecreated,
					datemodified,
					tags,
					description,
					icon

				},
			headers: {
       				'content-type': 'application/json',
				bearer: "password1234",
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
	margin: 1rem;
	padding: 0.2em 1em;
	border-radius: 1000px;
	background-color: var(--nord4);

}
.ingredient{
	display: flex;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
}
.ingredient > input{
	display: inline;
	margin-inline: 0.25em;
}
.ingredient>#unit{
	max-width: 40px;
}
.ingredient>#amount{
	max-width: 100px;
}
.ingredient button{
	all: unset;
	background-color: var(--red);
	padding: 0.3em;
	height: 100%;
	border-radius: 1000px;
	display:flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	transition: 100ms;
}
.ingredient button svg{
	fill: white;
	width: 1.5rem;
	height: 1.5rem;
}
.ingredient button:hover{
	background-color: var(--orange);
	transform: scale(1.1, 1.1);
}
.ingredient button:hover svg{
	transform: scale(1.1, 1.1);
}

</style>
<h1>Rezept hinzufügen</h1>

<CardAdd></CardAdd>

<input bind:value={short_name} placeholder="Kurzname"/>
<h2>Zutaten</h2>
<CreateIngredientList></CreateIngredientList>
<h2>Zubereitung</h2>
<CreateStepList></CreateStepList>

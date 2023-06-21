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
</style>
<h1>Rezept hinzufügen</h1>

<CardAdd></CardAdd>

<input bind:value={short_name} placeholder="Kurzname"/>
<h2>Zutaten</h2>
<input>
<h2>Zubereitung</h2>
<button on:click={doPost}>HIT IT</button>
<button on:click={console.log(tags)}>TAGS</button>
<h3>Zutaten</h3>

<!-- already added ingredients
<input type="number"><select name="" id=""></select><input type="text">

<br>
<br>
<input type="text" name="" id=""><button>Neue Unterkategorie hinzufügen</button>

<h3> Schritte </h3>
<input type="text">
<button>Neue Unterkategorie hinzufügen</button>
<br>
<input type="text"><button>Schritt hinzufügen</button>-->

<script lang="ts">
    	let name = 'name'
	let short_name = 'short_name'
	let category = 'category'
	let icon = 'icon'
	let description = 'description'
	let datecreated = new Date()
	let datemodified = datecreated
	let tags : string[] = []

    import type { PageData } from './$types';
    import '$lib/components/card.css';
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
	display: block;
	margin: 1rem;
}
</style>
<h1>Rezept hinzufügen</h1>

<input bind:value={short_name} />
<input bind:value={name} />
<input bind:value={icon} />
<input bind:value={category} />
<input bind:value={description} />
<input type="text" name="" id="" bind:value={tags}>

<button on:click={doPost}>HIT IT</button>
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

<script lang="ts">
	import CardAdd from '$lib/components/recipes/CardAdd.svelte';
    	import MediaScroller from '$lib/components/recipes/MediaScroller.svelte';
    	import Search from '$lib/components/recipes/Search.svelte';
	import SeasonSelect from '$lib/components/recipes/SeasonSelect.svelte';
	import CreateIngredientList from '$lib/components/recipes/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/recipes/CreateStepList.svelte';

	let {
		card_data = $bindable({}),
		season = $bindable([]),
		ingredients = $bindable([]),
		instructions = $bindable([])
	}: {
		card_data?: any,
		season?: any[],
		ingredients?: any[],
		instructions?: any[]
	} = $props();

	let short_name = $state('');
	let password = $state('');
	let datecreated = $state(new Date());
	let datemodified = $state(datecreated);
	let result = $state('');
	let image_preview_url = $state('');
	let selected_image_file = $state<File | null>(null);

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
	border-radius: var(--radius-pill);
	background-color: var(--nord4);

}
</style>

<CardAdd bind:card_data={card_data} bind:image_preview_url={image_preview_url} bind:selected_image_file={selected_image_file} {short_name}></CardAdd>

<input class=temp bind:value={short_name} placeholder="Kurzname"/>

<SeasonSelect></SeasonSelect>
<button onclick={() => console.log(season)}>PRINTOUT season</button>

<h2>Zutaten</h2>
<CreateIngredientList bind:ingredients={ingredients}></CreateIngredientList>
<h2>Zubereitung</h2>
<CreateStepList bind:instructions={instructions} add_info={{}}></CreateStepList>
<input class=temp type="password" placeholder=Passwort bind:value={password}>

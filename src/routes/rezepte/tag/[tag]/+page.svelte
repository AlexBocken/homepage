<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1;
    import Card from '$lib/components/Card.svelte'
    import Search from '$lib/components/Search.svelte';
    import { rand_array } from '$lib/js/randomize';
</script>
<style>
	h1 {
		text-align: center;
		font-size: 2em;
	}
</style>
<h1>Rezepte mit Stichwort <q>{data.tag}</q>:</h1>
<Search></Search>
<section>
<Recipes>
	{#each rand_array(data.recipes) as recipe}
		<Card {recipe} {current_month}></Card>
	{/each}
	</Recipes>
</section>

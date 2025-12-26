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
<h1>Recipes with Keyword <q>{data.tag}</q>:</h1>
<Search tag={data.tag}></Search>
<section>
<Recipes>
	{#each rand_array(data.recipes) as recipe}
		<Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/recipes"></Card>
	{/each}
	</Recipes>
</section>

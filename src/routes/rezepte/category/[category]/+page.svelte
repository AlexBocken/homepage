<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1;
    import Card from '$lib/components/Card.svelte'
</script>
<h1>Rezepte</h1>
<h2>In Kategorie {data.category}</h2>
<Search></Search>
<section>
<Recipes>
	{#each data.recipes as recipe}
		<Card {recipe} {current_month}></Card>
	{/each}
</Recipes>
</section>

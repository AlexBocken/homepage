<script lang="ts">
    import type { PageData } from './$types';
    import '$lib/components/card.css';
    import '$lib/components/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte'
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1
</script>

<SeasonLayout>

<h2 slot=test>Rezepte des Monats </h2>

<Recipes slot=recipes>
	{#each data.season as recipe}
		<Card {recipe} {current_month}></Card>
	{/each}
</Recipes>
</SeasonLayout>

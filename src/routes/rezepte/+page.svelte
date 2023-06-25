<script lang="ts">
    import type { PageData } from './$types';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Recipes from '$lib/components/Recipes.svelte';
    import AddButton from '$lib/components/AddButton.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1
</script>
<style>
h1{
	box-sizing: border-box;
	max-width: 1000px;
	padding-left: 5rem;
	margin-bottom: 0;
	font-size: 4rem;
}
</style>
<h1>Rezepte</h1>
<section>
<MediaScroller title="In Saison:">
{#each data.season as recipe}
	<Card {recipe} {current_month} search=""></Card>
{/each}
</MediaScroller>
</section>
<Search></Search>
<Recipes title="Alle Rezepte:">
	{#each data.all_brief as recipe}
	<Card {recipe} {current_month}></Card>
	{/each}
</Recipes>
<AddButton></AddButton>

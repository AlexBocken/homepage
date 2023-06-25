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
h1,
h2{
	max-width: 1000px;
	margin-left: 5rem;
	margin-bottom: 0;
}
h1{
font-size: 4rem;
}
h2{
	font-size: 3rem;
	margin-bottom: 1rem;
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

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
.accordion{
	display:flex;
	background-color: #111111;
	flex-direction: row;
	margin-inline: auto;
	padding-inline: 1rem;
	padding-block: 3rem;
	margin-block: 3rem;
	align-items:center;
	justify-content: center;
	gap: 1rem;
}
</style>
<h1>Rezepte</h1>
<h2>In Saison</h2>
<section>
<MediaScroller>
{#each data.season as recipe}
	<Card {recipe} {current_month}></Card>
{/each}
</MediaScroller>
</section>
<!--<Search></Search>-->
<h2>Alle Rezepte</h2>
<Recipes>
	{#each data.all_brief as recipe}
	<Card {recipe} {current_month}></Card>
	{/each}
</Recipes>
<AddButton></AddButton>

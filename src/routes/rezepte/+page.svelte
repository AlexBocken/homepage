<script lang="ts">
	import type { PageData } from './$types';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import AddButton from '$lib/components/AddButton.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';
    	export let data: PageData;
    	export let current_month = new Date().getMonth() + 1
	const all_categories = [ ...new Set (data.all_brief.map(item => item.category))];
	import { rand_array } from '$lib/js/randomize';
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
{#each rand_array(data.season) as recipe}
	<Card {recipe} {current_month} search=""></Card>
{/each}
</MediaScroller>
</section>
<Search></Search>

{#each all_categories as category}
	<MediaScroller title={category}>
	{#each rand_array(data.all_brief.filter(recipe => recipe.category == category)) as recipe}
		<Card {recipe} {current_month}></Card>
	{/each}
	</MediaScroller>
{/each}
<p>{data.all_brief.length}</p>
<AddButton></AddButton>

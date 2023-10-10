<script lang="ts">
	import type { PageData } from './$types';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import AddButton from '$lib/components/AddButton.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';
    	export let data: PageData;
    	export let current_month = new Date().getMonth() + 1
	const categories = ["Hauptspeise", "Nudel", "Brot", "Dessert", "Suppe", "Beilage", "Salat", "Kuchen", "Sauce", "Zutat", "Getränk", "Aufstrich", "Guetzli", "Unterwegs"]
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
<svelte:head>
	<title>Bocken Rezepte</title>
	<meta name="description" content="Eine stetig wachsende Ansammlung an Rezepten aus der Bockenschen Küche." />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/al_ragu.webp" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/al_ragu.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="Pasta al Ragu mit Linguine" />
</svelte:head>

<h1>Rezepte</h1>
<section>
<MediaScroller title="In Saison">
{#each data.season as recipe}
	<Card {recipe} {current_month} search=""></Card>
{/each}
</MediaScroller>
</section>
<Search></Search>

{#each categories as category}
	<MediaScroller title={category}>
	{#each data.all_brief.filter(recipe => recipe.category == category) as recipe}
		<Card {recipe} {current_month}></Card>
	{/each}
	</MediaScroller>
{/each}
<AddButton></AddButton>

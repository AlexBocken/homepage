<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { favorites, addFavoriteStatusToRecipes } from '$lib/stores/favorites';
	import { page } from '$app/stores';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import AddButton from '$lib/components/AddButton.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';
    	export let data: PageData;
    	export let current_month = new Date().getMonth() + 1
	const categories = ["Hauptspeise", "Nudel", "Brot", "Dessert", "Suppe", "Beilage", "Salat", "Kuchen", "Frühstück", "Sauce", "Zutat", "Getränk", "Aufstrich", "Guetzli", "Snack"];

	// Load favorites when component mounts and user is authenticated
	onMount(() => {
		if ($page.data.session?.user) {
			favorites.load();
		}
	});

	// Reactively add favorite status to recipes
	$: seasonWithFavorites = addFavoriteStatusToRecipes(data.season, $favorites.favorites);
	$: allBriefWithFavorites = addFavoriteStatusToRecipes(data.all_brief, $favorites.favorites);
</script>
<style>
h1{
	text-align: center;
	margin-bottom: 0;
	font-size: 4rem;
}
.subheading{
	text-align: center;
	margin-top: 0;
	font-size: 1.5rem;
}
</style>
<svelte:head>
	<title>Bocken Rezepte</title>
	<meta name="description" content="Eine stetig wachsende Ansammlung an Rezepten aus der Bockenschen Küche." />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="Pasta al Ragu mit Linguine" />
</svelte:head>

<h1>Rezepte</h1>
<p class=subheading>{data.all_brief.length} Rezepte und stetig wachsend...</p>

<Search></Search>

<MediaScroller title="In Saison">
{#each seasonWithFavorites as recipe}
	<Card {recipe} {current_month} loading_strat={"eager"} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!$page.data.session?.user}></Card>
{/each}
</MediaScroller>

{#each categories as category}
	<MediaScroller title={category}>
	{#each allBriefWithFavorites.filter(recipe => recipe.category == category) as recipe}
		<Card {recipe} {current_month} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!$page.data.session?.user}></Card>
	{/each}
	</MediaScroller>
{/each}
<AddButton></AddButton>

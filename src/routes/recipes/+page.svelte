<script lang="ts">
	import type { PageData } from './$types';
	import MediaScroller from '$lib/components/MediaScroller.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import Card from '$lib/components/Card.svelte';
	import Search from '$lib/components/Search.svelte';
	export let data: PageData;
	export let current_month = new Date().getMonth() + 1
	const categories = ["Main Course", "Pasta", "Bread", "Dessert", "Soup", "Side Dish", "Salad", "Cake", "Breakfast", "Sauce", "Ingredient", "Drink", "Spread", "Cookie", "Snack"]
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
	<title>Bocken Recipes</title>
	<meta name="description" content="A constantly growing collection of recipes from Bocken's kitchen." />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="Pasta al Ragu with Linguine" />
</svelte:head>

<h1>Recipes</h1>
<p class=subheading>{data.all_brief.length} recipes and constantly growing...</p>

<Search></Search>

<MediaScroller title="In Season">
{#each data.season as recipe}
	<Card {recipe} {current_month} loading_strat={"eager"} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/recipes"></Card>
{/each}
</MediaScroller>

{#each categories as category}
	<MediaScroller title={category}>
	{#each data.all_brief.filter(recipe => recipe.category == category) as recipe}
		<Card {recipe} {current_month} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/recipes"></Card>
	{/each}
	</MediaScroller>
{/each}
<AddButton href="/rezepte/add"></AddButton>

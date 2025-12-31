<script lang="ts">
	import type { PageData } from './$types';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import AddButton from '$lib/components/AddButton.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';
    	let { data }: { data: PageData } = $props();
    	let current_month = new Date().getMonth() + 1;

	// Search state
	let matchedRecipeIds = $state(new Set());
	let matchedCategories = $state(new Set());
	let hasActiveSearch = $state(false);

	// Handle search results from Search component
	function handleSearchResults(ids, categories) {
		matchedRecipeIds = ids;
		matchedCategories = categories || new Set();
		hasActiveSearch = ids.size < data.all_brief.length;
	}

	const isEnglish = $derived(data.lang === 'en');
	const categories = $derived(isEnglish
		? ["Main course", "Noodle", "Bread", "Dessert", "Soup", "Side dish", "Salad", "Cake", "Breakfast", "Sauce", "Ingredient", "Drink", "Spread", "Cookie", "Snack"]
		: ["Hauptspeise", "Nudel", "Brot", "Dessert", "Suppe", "Beilage", "Salat", "Kuchen", "Frühstück", "Sauce", "Zutat", "Getränk", "Aufstrich", "Guetzli", "Snack"]);

	const labels = $derived({
		title: isEnglish ? 'Recipes' : 'Rezepte',
		subheading: isEnglish
			? `${data.all_brief.length} recipes and constantly growing...`
			: `${data.all_brief.length} Rezepte und stetig wachsend...`,
		inSeason: isEnglish ? 'In Season' : 'In Saison',
		metaTitle: isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte',
		metaDescription: isEnglish
			? "A constantly growing collection of recipes from Bocken's kitchen."
			: "Eine stetig wachsende Ansammlung an Rezepten aus der Bockenschen Küche.",
		metaAlt: isEnglish ? 'Pasta al Ragu with Linguine' : 'Pasta al Ragu mit Linguine'
	});
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
	<title>{labels.metaTitle}</title>
	<meta name="description" content="{labels.metaDescription}" />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="{labels.metaAlt}" />
</svelte:head>

<h1>{labels.title}</h1>
<p class=subheading>{labels.subheading}</p>

<Search lang={data.lang} recipes={data.all_brief} onSearchResults={handleSearchResults}></Search>

{#if true}
	{@const seasonRecipes = data.season.filter(recipe =>
		!hasActiveSearch || matchedRecipeIds.has(recipe._id)
	)}
	{#if seasonRecipes.length > 0}
		<MediaScroller title={labels.inSeason}>
		{#each seasonRecipes as recipe}
			<Card {recipe} {current_month} loading_strat={"eager"} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
		{/each}
		</MediaScroller>
	{/if}
{/if}

{#each categories as category}
	{@const categoryRecipes = data.all_brief.filter(recipe =>
		recipe.category === category &&
		(!hasActiveSearch || matchedRecipeIds.has(recipe._id))
	)}
	{#if categoryRecipes.length > 0}
		<MediaScroller title={category}>
		{#each categoryRecipes as recipe}
			<Card {recipe} {current_month} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
		{/each}
		</MediaScroller>
	{/if}
{/each}
{#if !isEnglish}
	<AddButton href="/rezepte/add"></AddButton>
{/if}

<script lang="ts">
	import type { PageData } from './$types';
    	import MediaScroller from '$lib/components/MediaScroller.svelte';
    	import AddButton from '$lib/components/AddButton.svelte';
    	import Card from '$lib/components/Card.svelte';
    	import Search from '$lib/components/Search.svelte';
    	let { data }: { data: PageData } = $props();
    	let current_month = new Date().getMonth() + 1

	const isEnglish = $derived(data.lang === 'en');
	const categories = $derived(isEnglish
		? ["Main Course", "Pasta", "Bread", "Dessert", "Soup", "Side Dish", "Salad", "Cake", "Breakfast", "Sauce", "Ingredient", "Drink", "Spread", "Cookie", "Snack"]
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

<Search></Search>

<MediaScroller title={labels.inSeason}>
{#each data.season as recipe}
	<Card {recipe} {current_month} loading_strat={"eager"} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
{/each}
</MediaScroller>

{#each categories as category}
	<MediaScroller title={category}>
	{#each data.all_brief.filter(recipe => recipe.category == category) as recipe}
		<Card {recipe} {current_month} do_margin_right={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
	{/each}
	</MediaScroller>
{/each}
{#if !isEnglish}
	<AddButton href="/rezepte/add"></AddButton>
{/if}

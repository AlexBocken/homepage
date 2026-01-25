<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from '$lib/components/Search.svelte';
    import Card from '$lib/components/Card.svelte';
    import { rand_array } from '$lib/js/randomize';
    import { createSearchFilter } from '$lib/js/searchFilter.svelte';

    let { data } = $props<{ data: PageData }>();
    let current_month = new Date().getMonth() + 1;

    const isEnglish = $derived(data.lang === 'en');
    const label = $derived(isEnglish ? 'Recipes in Category' : 'Rezepte in Kategorie');
    const siteTitle = $derived(isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte');

    const { filtered: filteredRecipes, handleSearchResults } = createSearchFilter(() => data.recipes);
</script>
<style>
	h1 {
		text-align: center;
		font-size: 3em;
	}
</style>

<svelte:head>
    <title>{data.category} - {siteTitle}</title>
</svelte:head>

<h1>{label} <q>{data.category}</q>:</h1>
<Search category={data.category} lang={data.lang} recipes={data.recipes} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}></Search>
<section>
<Recipes>
	{#each rand_array(filteredRecipes) as recipe}
		<Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
	{/each}
</Recipes>
</section>

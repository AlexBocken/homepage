<script lang="ts">
    import type { PageData } from './$types';
    import Search from '$lib/components/recipes/Search.svelte';
    import CompactCard from '$lib/components/recipes/CompactCard.svelte';
    import { rand_array } from '$lib/js/randomize';

    let { data } = $props<{ data: PageData }>();
    let current_month = new Date().getMonth() + 1;

    const isEnglish = $derived(data.lang === 'en');
    const label = $derived(isEnglish ? 'Recipes in Category' : 'Rezepte in Kategorie');
    const siteTitle = $derived(isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte');

    let matchedRecipeIds = $state(new Set());
    let hasActiveSearch = $state(false);

    function handleSearchResults(ids: Set<string>, categories: Set<string>) {
        matchedRecipeIds = ids;
        hasActiveSearch = ids.size < data.allRecipes.length;
    }

    const displayRecipes = $derived.by(() => {
        if (!hasActiveSearch) return data.recipes;
        return data.allRecipes.filter((r: any) => matchedRecipeIds.has(r._id));
    });
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
<Search category={data.category} lang={data.lang} recipes={data.allRecipes} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}></Search>
<div class="recipe-grid">
	{#each rand_array(displayRecipes) as recipe (recipe._id)}
		<CompactCard {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}" />
	{/each}
</div>

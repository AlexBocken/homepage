<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from '$lib/components/Search.svelte';
    let { data }: { data: PageData } = $props();
    let current_month = new Date().getMonth() + 1;
    import Card from '$lib/components/Card.svelte'
    import { rand_array } from '$lib/js/randomize';

    const isEnglish = $derived(data.lang === 'en');
    const label = $derived(isEnglish ? 'Recipes in Category' : 'Rezepte in Kategorie');

    // Search state
    let matchedRecipeIds = $state(new Set());
    let hasActiveSearch = $state(false);

    // Handle search results from Search component
    function handleSearchResults(ids, categories) {
        matchedRecipeIds = ids;
        hasActiveSearch = ids.size < data.recipes.length;
    }

    // Filter recipes based on search
    const filteredRecipes = $derived.by(() => {
        if (!hasActiveSearch) {
            return data.recipes;
        }
        return data.recipes.filter(r => matchedRecipeIds.has(r._id));
    });
</script>
<style>
	h1 {
		text-align: center;
		font-size: 3em;
	}
</style>
<h1>{label} <q>{data.category}</q>:</h1>
<Search category={data.category} lang={data.lang} recipes={data.recipes} onSearchResults={handleSearchResults}></Search>
<section>
<Recipes>
	{#each rand_array(filteredRecipes) as recipe}
		<Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
	{/each}
</Recipes>
</section>

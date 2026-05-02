<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    import type { BriefRecipeType } from '$types/types';
    import Search from '$lib/components/recipes/Search.svelte';
    import CompactCard from '$lib/components/recipes/CompactCard.svelte';
    import { rand_array } from '$lib/js/randomize';

    type RecipeItem = BriefRecipeType & { isFavorite: boolean };

    let { data } = $props<{ data: PageData }>();

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const label = $derived(t.recipes_in_category);
    const siteTitle = $derived(t.site_title);

    let matchedRecipeIds = $state(new Set<string>());
    let hasActiveSearch = $state(false);

    function handleSearchResults(ids: Set<string>, categories: Set<string>) {
        matchedRecipeIds = ids;
        hasActiveSearch = ids.size < (data.allRecipes as RecipeItem[]).length;
    }

    const displayRecipes = $derived.by((): RecipeItem[] => {
        const all = data.allRecipes as RecipeItem[];
        const base = data.recipes as RecipeItem[];
        if (!hasActiveSearch) return base;
        return all.filter((r) => matchedRecipeIds.has(r._id));
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
		<CompactCard {recipe} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })} />
	{/each}
</div>

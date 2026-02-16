<script lang="ts">
    import type { PageData } from './$types';
    import IconLayout from '$lib/components/recipes/IconLayout.svelte';
    import CompactCard from '$lib/components/recipes/CompactCard.svelte';
    let { data } = $props<{ data: PageData }>();
    import { rand_array } from '$lib/js/randomize';

    const isEnglish = $derived(data.lang === 'en');
    const siteTitle = $derived(isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte');

    // Search state
    let matchedRecipeIds = $state(new Set());
    let hasActiveSearch = $state(false);

    // Handle search results from Search component
    function handleSearchResults(ids, categories) {
        matchedRecipeIds = ids;
        hasActiveSearch = ids.size < data.season.length;
    }

    // Filter recipes based on search
    const filteredRecipes = $derived.by(() => {
        if (!hasActiveSearch) {
            return data.season;
        }
        return data.season.filter(r => matchedRecipeIds.has(r._id));
    });
</script>

<svelte:head>
    <title>{data.icon} - {siteTitle}</title>
</svelte:head>

<IconLayout icons={data.icons} active_icon={data.icon} routePrefix="/{data.recipeLang}" lang={data.lang} recipes={data.season} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}>
	{#snippet recipesSlot()}
		<div class="recipe-grid">
			{#each rand_array(filteredRecipes) as recipe (recipe._id)}
				<CompactCard {recipe} icon_override={true} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}" />
			{/each}
		</div>
	{/snippet}
</IconLayout>

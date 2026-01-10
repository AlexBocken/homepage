<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import IconLayout from '$lib/components/IconLayout.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    let { data } = $props<{ data: PageData }>();
    import { rand_array } from '$lib/js/randomize';

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
<IconLayout icons={data.icons} active_icon={data.icon} routePrefix="/{data.recipeLang}" lang={data.lang} recipes={data.season} onSearchResults={handleSearchResults}>
	{#snippet recipesSlot()}
		<Recipes>
			{#each rand_array(filteredRecipes) as recipe}
				<Card {recipe} icon_override=true isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
			{/each}
		</Recipes>
	{/snippet}
</IconLayout>

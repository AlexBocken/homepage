<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    let { data } = $props<{ data: PageData }>();

    const isEnglish = $derived(data.lang === 'en');
    const months = $derived(isEnglish
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]);
    const siteTitle = $derived(isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte');
    const currentMonth = $derived(months[data.month - 1]);

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

<svelte:head>
    <title>{currentMonth} - {siteTitle}</title>
</svelte:head>

<SeasonLayout active_index={data.month -1} {months} routePrefix="/{data.recipeLang}" lang={data.lang} recipes={data.season} onSearchResults={handleSearchResults}>
	{#snippet recipesSlot()}
		<Recipes>
			{#each rand_array(filteredRecipes) as recipe}
				<Card {recipe} icon_override=true isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
			{/each}
		</Recipes>
	{/snippet}
</SeasonLayout>

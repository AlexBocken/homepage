<script lang="ts">
    import type { PageData } from './$types';
    import '$lib/css/nordtheme.css';
    import Recipes from '$lib/components/recipes/Recipes.svelte';
    import MediaScroller from '$lib/components/recipes/MediaScroller.svelte';
    import SeasonLayout from '$lib/components/recipes/SeasonLayout.svelte'
    import Card from '$lib/components/recipes/Card.svelte';
    import Search from '$lib/components/recipes/Search.svelte';
    let { data } = $props<{ data: PageData }>();
    let current_month = new Date().getMonth() + 1
    import { rand_array } from '$lib/js/randomize';

    const isEnglish = $derived(data.lang === 'en');
    const months = $derived(isEnglish
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]);
    const labels = $derived({
        title: isEnglish ? 'In Season' : 'Saisonal',
        siteTitle: isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte'
    });

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
    <title>{labels.title} - {labels.siteTitle}</title>
</svelte:head>

<SeasonLayout active_index={current_month-1} {months} routePrefix="/{data.recipeLang}" lang={data.lang} recipes={data.season} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}>
	{#snippet recipesSlot()}
		<Recipes>
			{#each rand_array(filteredRecipes) as recipe}
				<Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
			{/each}
		</Recipes>
	{/snippet}
</SeasonLayout>

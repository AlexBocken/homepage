<script lang="ts">
    import type { PageData } from './$types';
    import '$lib/css/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    let { data } = $props<{ data: PageData }>();
    let current_month = new Date().getMonth() + 1;

    const isEnglish = $derived(data.lang === 'en');
    const labels = $derived({
        title: isEnglish ? 'Favorites' : 'Favoriten',
        pageTitle: isEnglish ? 'My Favorites - Bocken Recipes' : 'Meine Favoriten - Bocken Rezepte',
        metaDescription: isEnglish
            ? 'My favorite recipes from Bocken\'s kitchen.'
            : 'Meine favorisierten Rezepte aus der Bockenschen Küche.',
        count: isEnglish
            ? `${data.favorites.length} favorite recipe${data.favorites.length !== 1 ? 's' : ''}`
            : `${data.favorites.length} favorisierte Rezepte`,
        noFavorites: isEnglish ? 'No favorites saved yet' : 'Noch keine Favoriten gespeichert',
        errorLoading: isEnglish ? 'Error loading favorites:' : 'Fehler beim Laden der Favoriten:',
        emptyState1: isEnglish
            ? 'You haven\'t saved any recipes as favorites yet.'
            : 'Du hast noch keine Rezepte als Favoriten gespeichert.',
        emptyState2: isEnglish
            ? 'Visit a recipe and click the heart icon to add it to your favorites.'
            : 'Besuche ein Rezept und klicke auf das Herz-Symbol, um es zu deinen Favoriten hinzuzufügen.',
        recipesLink: isEnglish ? 'recipe' : 'Rezept'
    });

    // Search state
    let matchedRecipeIds = $state(new Set());
    let hasActiveSearch = $state(false);

    // Handle search results from Search component
    function handleSearchResults(ids, categories) {
        matchedRecipeIds = ids;
        hasActiveSearch = ids.size < data.favorites.length;
    }

    // Filter recipes based on search
    const filteredFavorites = $derived.by(() => {
        if (!hasActiveSearch) {
            return data.favorites;
        }
        return data.favorites.filter(r => matchedRecipeIds.has(r._id));
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
.empty-state{
    text-align: center;
    margin-top: 3rem;
    color: var(--nord3);
}
</style>

<svelte:head>
    <title>{labels.pageTitle}</title>
    <meta name="description" content={labels.metaDescription} />
</svelte:head>

<h1>{labels.title}</h1>
<p class=subheading>
    {#if data.favorites.length > 0}
        {labels.count}
    {:else}
        {labels.noFavorites}
    {/if}
</p>

<Search favoritesOnly={true} lang={data.lang} recipes={data.favorites} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}></Search>

{#if data.error}
    <p class="empty-state">{labels.errorLoading} {data.error}</p>
{:else if filteredFavorites.length > 0}
    <Recipes>
        {#each filteredFavorites as recipe}
            <Card {recipe} {current_month} isFavorite={true} showFavoriteIndicator={true} routePrefix="/{data.recipeLang}"></Card>
        {/each}
    </Recipes>
{:else if data.favorites.length > 0}
    <div class="empty-state">
        <p>{isEnglish ? 'No matching favorites found.' : 'Keine passenden Favoriten gefunden.'}</p>
    </div>
{:else}
    <div class="empty-state">
        <p>{labels.emptyState1}</p>
        <p><a href="/{data.recipeLang}">{labels.emptyState2}</a></p>
    </div>
{/if}
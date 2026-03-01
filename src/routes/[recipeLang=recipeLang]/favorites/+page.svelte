<script lang="ts">
    import type { PageData } from './$types';
    import CompactCard from '$lib/components/recipes/CompactCard.svelte';
    import Search from '$lib/components/recipes/Search.svelte';
    import { createSearchFilter } from '$lib/js/searchFilter.svelte';

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
        recipesLink: isEnglish ? 'recipe' : 'Rezept',
        toTry: isEnglish ? 'Recipes to try' : 'Zum Ausprobieren'
    });

    const { filtered: filteredFavorites, handleSearchResults } = createSearchFilter(() => data.favorites);
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
    color: var(--color-text-tertiary);
}
.to-try-link{
    text-align: center;
    margin-bottom: 1.5em;
}
.to-try-link a{
    display: inline-block;
    padding: 0.4em 1.2em;
    border-radius: var(--radius-pill);
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
}
.to-try-link a:hover,
.to-try-link a:focus-visible{
    transform: scale(1.05);
    background: var(--color-primary-hover);
    box-shadow: var(--shadow-hover);
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

<p class="to-try-link"><a href="/{data.recipeLang}/to-try">{labels.toTry} &rarr;</a></p>

<Search favoritesOnly={true} lang={data.lang} recipes={data.favorites} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}></Search>

{#if data.error}
    <p class="empty-state">{labels.errorLoading} {data.error}</p>
{:else if filteredFavorites.length > 0}
    <div class="recipe-grid">
        {#each filteredFavorites as recipe (recipe._id)}
            <CompactCard {recipe} {current_month} isFavorite={true} showFavoriteIndicator={true} routePrefix="/{data.recipeLang}" />
        {/each}
    </div>
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
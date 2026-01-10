<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from '$lib/components/Search.svelte';
    import Card from '$lib/components/Card.svelte';
    let { data } = $props<{ data: PageData }>();
    let current_month = new Date().getMonth() + 1;

    const isEnglish = $derived(data.lang === 'en');
    const categories = $derived(isEnglish
        ? ["Main course", "Noodle", "Bread", "Dessert", "Soup", "Side dish", "Salad", "Cake", "Breakfast", "Sauce", "Ingredient", "Drink", "Spread", "Biscuits", "Snack"]
        : ["Hauptspeise", "Nudel", "Brot", "Dessert", "Suppe", "Beilage", "Salat", "Kuchen", "Frühstück", "Sauce", "Zutat", "Getränk", "Aufstrich", "Guetzli", "Snack"]);
    const labels = $derived({
        title: isEnglish ? 'Search Results' : 'Suchergebnisse',
        pageTitle: isEnglish
            ? `Search Results${data.query ? ` for "${data.query}"` : ''} - Bocken Recipes`
            : `Suchergebnisse${data.query ? ` für "${data.query}"` : ''} - Bocken Rezepte`,
        metaDescription: isEnglish
            ? 'Search results in Bocken\'s recipes.'
            : 'Suchergebnisse in den Bockenschen Rezepten.',
        filteredBy: isEnglish ? 'Filtered by:' : 'Gefiltert nach:',
        category: isEnglish ? 'Category' : 'Kategorie',
        keywords: isEnglish ? 'Keywords' : 'Stichwörter',
        icon: 'Icon',
        seasons: isEnglish ? 'Seasons' : 'Monate',
        favoritesOnly: isEnglish ? 'Favorites only' : 'Nur Favoriten',
        searchError: isEnglish ? 'Search error:' : 'Fehler bei der Suche:',
        resultsFor: isEnglish ? 'results for' : 'Ergebnisse für',
        noResults: isEnglish ? 'No recipes found.' : 'Keine Rezepte gefunden.',
        tryOther: isEnglish ? 'Try different search terms.' : 'Versuche es mit anderen Suchbegriffen.'
    });

    // Search state for live filtering
    let matchedRecipeIds = $state(new Set());
    let hasActiveSearch = $state(false);

    // Handle search results from Search component
    function handleSearchResults(ids, categories) {
        matchedRecipeIds = ids;
        hasActiveSearch = ids.size < data.allRecipes.length;
    }

    // Filter recipes based on live search
    const displayedRecipes = $derived.by(() => {
        if (!hasActiveSearch) {
            // No active search - show server-side results
            return data.results;
        }
        // Active search - show client-side filtered results
        return data.allRecipes.filter(r => matchedRecipeIds.has(r._id));
    });
</script>

<style>
    h1 {
        text-align: center;
        font-size: 3em;
    }
    .search-info {
        text-align: center;
        margin-bottom: 2rem;
        color: var(--nord3);
    }
    .filter-info {
        text-align: center;
        margin-bottom: 1rem;
        font-size: 0.9em;
        color: var(--nord2);
    }
</style>

<svelte:head>
    <title>{labels.pageTitle}</title>
    <meta name="description" content={labels.metaDescription} />
</svelte:head>

<h1>{labels.title}</h1>

{#if data.filters.category || data.filters.tags?.length > 0 || data.filters.icon || data.filters.seasons?.length > 0 || data.filters.favoritesOnly}
    <div class="filter-info">
        {labels.filteredBy}
        {#if data.filters.category}{labels.category}: "{data.filters.category}"{/if}
        {#if data.filters.tags?.length > 0}{labels.keywords}: {data.filters.tags.join(', ')}{/if}
        {#if data.filters.icon}{labels.icon}: "{data.filters.icon}"{/if}
        {#if data.filters.seasons?.length > 0}{labels.seasons}: {data.filters.seasons.join(', ')}{/if}
        {#if data.filters.favoritesOnly}{labels.favoritesOnly}{/if}
    </div>
{/if}

<Search
    category={data.filters.category}
    tag={data.filters.tags?.[0] || null}
    icon={data.filters.icon}
    season={data.filters.seasons?.[0] || null}
    favoritesOnly={data.filters.favoritesOnly}
    lang={data.lang}
    recipes={data.allRecipes}
    categories={categories}
    isLoggedIn={!!data.session?.user}
    onSearchResults={handleSearchResults}
/>

{#if data.error}
    <div class="search-info">
        <p>{labels.searchError} {data.error}</p>
    </div>
{:else if hasActiveSearch}
    <div class="search-info">
        <p>{displayedRecipes.length} {labels.resultsFor} "{data.query}"</p>
    </div>
{:else if data.query}
    <div class="search-info">
        <p>{data.results.length} {labels.resultsFor} "{data.query}"</p>
    </div>
{/if}

{#if displayedRecipes.length > 0}
    <Recipes>
        {#each displayedRecipes as recipe}
            <Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={true} routePrefix="/{data.recipeLang}"></Card>
        {/each}
    </Recipes>
{:else if (data.query || hasActiveSearch) && !data.error}
    <div class="search-info">
        <p>{labels.noResults}</p>
        <p>{labels.tryOther}</p>
    </div>
{/if}
<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from '$lib/components/Search.svelte';
    import Card from '$lib/components/Card.svelte';
    let { data }: { data: PageData } = $props();
    let current_month = new Date().getMonth() + 1;

    const isEnglish = $derived(data.lang === 'en');
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
        keyword: isEnglish ? 'Keyword' : 'Stichwort',
        icon: 'Icon',
        season: isEnglish ? 'Season' : 'Saison',
        favoritesOnly: isEnglish ? 'Favorites only' : 'Nur Favoriten',
        searchError: isEnglish ? 'Search error:' : 'Fehler bei der Suche:',
        resultsFor: isEnglish ? 'results for' : 'Ergebnisse für',
        noResults: isEnglish ? 'No recipes found.' : 'Keine Rezepte gefunden.',
        tryOther: isEnglish ? 'Try different search terms.' : 'Versuche es mit anderen Suchbegriffen.'
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

{#if data.filters.category || data.filters.tag || data.filters.icon || data.filters.season || data.filters.favoritesOnly}
    <div class="filter-info">
        {labels.filteredBy}
        {#if data.filters.category}{labels.category} "{data.filters.category}"{/if}
        {#if data.filters.tag}{labels.keyword} "{data.filters.tag}"{/if}
        {#if data.filters.icon}{labels.icon} "{data.filters.icon}"{/if}
        {#if data.filters.season}{labels.season} "{data.filters.season}"{/if}
        {#if data.filters.favoritesOnly}{labels.favoritesOnly}{/if}
    </div>
{/if}

<Search
    category={data.filters.category}
    tag={data.filters.tag}
    icon={data.filters.icon}
    season={data.filters.season}
    favoritesOnly={data.filters.favoritesOnly}
    lang={data.lang}
/>

{#if data.error}
    <div class="search-info">
        <p>{labels.searchError} {data.error}</p>
    </div>
{:else if data.query}
    <div class="search-info">
        <p>{data.results.length} {labels.resultsFor} "{data.query}"</p>
    </div>
{/if}

{#if data.results.length > 0}
    <Recipes>
        {#each data.results as recipe}
            <Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={true} routePrefix="/{data.recipeLang}"></Card>
        {/each}
    </Recipes>
{:else if data.query && !data.error}
    <div class="search-info">
        <p>{labels.noResults}</p>
        <p>{labels.tryOther}</p>
    </div>
{/if}
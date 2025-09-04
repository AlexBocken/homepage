<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from '$lib/components/Search.svelte';
    import Card from '$lib/components/Card.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1;
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
    <title>Suchergebnisse{data.query ? ` für "${data.query}"` : ''} - Bocken Rezepte</title>
    <meta name="description" content="Suchergebnisse in den Bockenschen Rezepten." />
</svelte:head>

<h1>Suchergebnisse</h1>

{#if data.filters.category || data.filters.tag || data.filters.icon || data.filters.season || data.filters.favoritesOnly}
    <div class="filter-info">
        Gefiltert nach:
        {#if data.filters.category}Kategorie "{data.filters.category}"{/if}
        {#if data.filters.tag}Stichwort "{data.filters.tag}"{/if}
        {#if data.filters.icon}Icon "{data.filters.icon}"{/if}
        {#if data.filters.season}Saison "{data.filters.season}"{/if}
        {#if data.filters.favoritesOnly}Nur Favoriten{/if}
    </div>
{/if}

<Search 
    category={data.filters.category}
    tag={data.filters.tag}
    icon={data.filters.icon}
    season={data.filters.season}
    favoritesOnly={data.filters.favoritesOnly}
/>

{#if data.error}
    <div class="search-info">
        <p>Fehler bei der Suche: {data.error}</p>
    </div>
{:else if data.query}
    <div class="search-info">
        <p>{data.results.length} Ergebnisse für "{data.query}"</p>
    </div>
{/if}

{#if data.results.length > 0}
    <Recipes>
        {#each data.results as recipe}
            <Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={true}></Card>
        {/each}
    </Recipes>
{:else if data.query && !data.error}
    <div class="search-info">
        <p>Keine Rezepte gefunden.</p>
        <p>Versuche es mit anderen Suchbegriffen.</p>
    </div>
{/if}
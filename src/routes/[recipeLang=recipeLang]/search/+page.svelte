<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    import Search from '$lib/components/recipes/Search.svelte';
    import CompactCard from '$lib/components/recipes/CompactCard.svelte';
    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    let { data } = $props<{ data: PageData }>();

    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const labels = $derived({
        title: t.search_results_title,
        pageTitle: `${t.search_results_title}${data.query ? ` ${t.search_results_for_word} "${data.query}"` : ''} - ${t.site_title}`,
        metaDescription: t.search_meta_description,
        filteredBy: t.filtered_by,
        category: t.category_nav,
        keywords: t.keywords_label,
        icon: t.icon_nav,
        seasons: t.seasons_label,
        favoritesOnly: t.favorites_only,
        searchError: t.search_error,
        resultsFor: t.results_for,
        noResults: t.no_recipes_found,
        tryOther: t.try_other_search
    });

    // Search state for live filtering
    let matchedRecipeIds = $state(new Set());
    let hasActiveSearch = $state(false);

    // Handle search results from Search component
    function handleSearchResults(ids: Set<string>, categories: Set<string>) {
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
        return data.allRecipes.filter((r: any) => matchedRecipeIds.has(r._id));
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
        color: var(--color-text-secondary);
    }
    .filter-info {
        text-align: center;
        margin-bottom: 1rem;
        font-size: 0.9em;
        color: var(--color-text-tertiary);
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
    <div class="recipe-grid">
        {#each displayedRecipes as recipe (recipe._id)}
            <CompactCard {recipe} isFavorite={recipe.isFavorite} showFavoriteIndicator={true} routePrefix={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })} />
        {/each}
    </div>
{:else if (data.query || hasActiveSearch) && !data.error}
    <div class="search-info">
        <p>{labels.noResults}</p>
        <p>{labels.tryOther}</p>
    </div>
{/if}
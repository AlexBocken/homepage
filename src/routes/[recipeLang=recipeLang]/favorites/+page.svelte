<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    import CompactCard from '$lib/components/recipes/CompactCard.svelte';
    import Search from '$lib/components/recipes/Search.svelte';

    let { data } = $props<{ data: PageData }>();
    let current_month = new Date().getMonth() + 1;

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const isEnglish = $derived(lang === 'en');
    const labels = $derived({
        title: t.favorites,
        pageTitle: t.favorites_page_title,
        metaDescription: t.favorites_meta_description,
        count: isEnglish
            ? `${data.favorites.length} favorite recipe${data.favorites.length !== 1 ? 's' : ''}`
            : `${data.favorites.length} favorisierte Rezepte`,
        noFavorites: t.no_favorites_yet,
        errorLoading: t.error_loading_favorites,
        emptyState1: t.empty_favorites_1,
        emptyState2: t.empty_favorites_2,
        recipesLink: t.recipe_singular_link,
        toTry: t.recipes_to_try_link
    });

    let matchedRecipeIds = $state(new Set());
    let hasActiveSearch = $state(false);

    function handleSearchResults(ids: Set<string>, categories: Set<string>) {
        matchedRecipeIds = ids;
        hasActiveSearch = ids.size < data.favorites.length;
    }

    const filteredFavorites = $derived.by(() => {
        if (!hasActiveSearch) return data.favorites;
        return data.favorites.filter((r: any) => matchedRecipeIds.has(r._id));
    });
</script>

<style>
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

<h1 class="sr-only">{labels.title}</h1>
<p class=subheading>
    {#if data.favorites.length > 0}
        {labels.count}
    {:else}
        {labels.noFavorites}
    {/if}
</p>

<p class="to-try-link"><a href={resolve('/[recipeLang=recipeLang]/to-try', { recipeLang: data.recipeLang })}>{labels.toTry} &rarr;</a></p>

<Search favoritesOnly={true} lang={data.lang} recipes={data.favorites} isLoggedIn={!!data.session?.user} onSearchResults={handleSearchResults}></Search>

{#if data.error}
    <p class="empty-state">{labels.errorLoading} {data.error}</p>
{:else if filteredFavorites.length > 0}
    <div class="recipe-grid">
        {#each filteredFavorites as recipe (recipe._id)}
            <CompactCard {recipe} {current_month} isFavorite={true} showFavoriteIndicator={true} routePrefix={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })} />
        {/each}
    </div>
{:else if data.favorites.length > 0}
    <div class="empty-state">
        <p>{isEnglish ? 'No matching favorites found.' : 'Keine passenden Favoriten gefunden.'}</p>
    </div>
{:else}
    <div class="empty-state">
        <p>{labels.emptyState1}</p>
        <p><a href={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })}>{labels.emptyState2}</a></p>
    </div>
{/if}
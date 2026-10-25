<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
    import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
    import { createRecipeBrowse } from '$lib/js/recipeBrowse.svelte';

    let { data }: { data: PageData } = $props();

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const countLabel = $derived(
        lang === 'en'
            ? (data.favorites.length === 1 ? t.favorite_recipe_singular : t.favorite_recipes_plural)
            : t.favorites_count_label
    );
    const labels = $derived({
        title: t.favorites,
        pageTitle: t.favorites_page_title,
        metaDescription: t.favorites_meta_description,
        count: `${data.favorites.length} ${countLabel}`,
        noFavorites: t.no_favorites_yet,
        errorLoading: t.error_loading_favorites,
        emptyState1: t.empty_favorites_1,
        emptyState2: t.empty_favorites_2,
        recipesLink: t.recipe_singular_link,
        toTry: t.recipes_to_try_link
    });

    // The pool is already every favourite, so the rail's favourites toggle is
    // left off the sheet here — see `showFavoritesFilter`.
    const browse = createRecipeBrowse(() => data.favorites);
</script>

<style>
.subheading{
    text-align: center;
    /* The h1 is screen-reader-only, so this is the first thing under the
       header — it needs the gap the heading would have given it. */
    margin-top: 2rem;
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

{#if data.error}
    <p class="empty-state">{labels.errorLoading} {data.error}</p>
{:else if data.favorites.length > 0}
    <RecipeSearchField {browse} {lang} recipeLang={data.recipeLang} />
    <RecipeBrowse
        {browse}
        {lang}
        recipeLang={data.recipeLang}
        isLoggedIn={true}
        showFavoritesFilter={false}
    />
{:else}
    <div class="empty-state">
        <p>{labels.emptyState1}</p>
        <p><a href={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })}>{labels.emptyState2}</a></p>
    </div>
{/if}

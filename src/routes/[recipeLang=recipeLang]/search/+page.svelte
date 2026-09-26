<script lang="ts">
    import type { PageData } from './$types';
    import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
    import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
    import { createRecipeBrowse, seedRecipeBrowseFrom } from '$lib/js/recipeBrowse.svelte';
    import { m, type RecipesLang } from '$lib/js/recipesI18n';

    let { data } = $props<{ data: PageData }>();

    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const labels = $derived({
        title: t.search_results_title,
        pageTitle: `${t.search_results_title}${data.query ? ` ${t.search_results_for_word} "${data.query}"` : ''} - ${t.site_title}`,
        metaDescription: t.search_meta_description,
        searchError: t.search_error
    });

    // An `?icon=` link narrows the pool rather than the rail: icons are their
    // own listing (/rezepte/icon), not one of the rail's facets.
    const pool = $derived(
        data.filters.icon
            ? data.allRecipes.filter((r: any) => r.icon === data.filters.icon)
            : data.allRecipes
    );

    const browse = createRecipeBrowse(() => pool);

    // Everything else the URL asked for opens as pressed filters in the rail.
    const seedOf = (d: PageData) => ({
        query: d.query,
        category: d.filters.category,
        tags: d.filters.tags,
        months: d.filters.seasons,
        favoritesOnly: d.filters.favoritesOnly
    });
    seedRecipeBrowseFrom(browse, () => seedOf(data));
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
</style>

<svelte:head>
    <title>{labels.pageTitle}</title>
    <meta name="description" content={labels.metaDescription} />
</svelte:head>

<h1>{labels.title}</h1>

<RecipeSearchField {browse} {lang} recipeLang={data.recipeLang} />

{#if data.error}
    <div class="search-info">
        <p>{labels.searchError} {data.error}</p>
    </div>
{:else}
    <RecipeBrowse {browse} {lang} recipeLang={data.recipeLang} isLoggedIn={!!data.session?.user} />
{/if}

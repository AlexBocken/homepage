<script lang="ts">
    import type { PageData } from './$types';
    import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
    import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
    import Seo from '$lib/components/Seo.svelte';
    import { createRecipeBrowse, seedRecipeBrowse } from '$lib/js/recipeBrowse.svelte';

    let { data } = $props<{ data: PageData }>();

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const label = $derived(t.recipes_in_category);
    const siteTitle = $derived(t.site_title);

    // The whole collection is the pool; the category is just where the rail
    // starts, so it can be widened from here. Offline the cache may only hold
    // this category — then that is all there is to browse.
    const browse = createRecipeBrowse(() => data.allRecipes?.length ? data.allRecipes : data.recipes);
    // svelte-ignore state_referenced_locally
    let seeded = data.category;
    // svelte-ignore state_referenced_locally
    seedRecipeBrowse(browse, { category: data.category });
    $effect(() => {
        if (data.category === seeded) return;
        seeded = data.category;
        seedRecipeBrowse(browse, { category: data.category });
    });
</script>
<style>
	h1 {
		text-align: center;
		font-size: 3em;
	}
</style>

<Seo
    title={`${data.category} — ${siteTitle}`}
    description={`${t.category_meta_prefix} ${data.category}.`}
    lang={lang}
/>

<h1>{label} <q>{data.category}</q>:</h1>
<RecipeSearchField {browse} {lang} recipeLang={data.recipeLang} />
<RecipeBrowse {browse} {lang} recipeLang={data.recipeLang} isLoggedIn={!!data.session?.user} />

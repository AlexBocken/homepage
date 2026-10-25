<script lang="ts">
    import type { PageData } from './$types';
    import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
    import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
    import Seo from '$lib/components/Seo.svelte';
    import { createRecipeBrowse, seedRecipeBrowseFrom } from '$lib/js/recipeBrowse.svelte';

    let { data }: { data: PageData } = $props();

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const label = $derived(t.recipes_with_keyword);
    const siteTitle = $derived(t.site_title);

    // The whole collection is the pool; the keyword is just where the rail
    // starts, so it can be widened from here. Offline the cache may only hold
    // this keyword — then that is all there is to browse.
    const browse = createRecipeBrowse(() => data.allRecipes?.length ? data.allRecipes : data.recipes);
    seedRecipeBrowseFrom(browse, () => ({ tags: [data.tag] }));
</script>
<style>
	h1 {
		text-align: center;
		font-size: 2em;
	}
</style>

<Seo
    title={`${data.tag} — ${siteTitle}`}
    description={`${t.tag_meta_prefix} ${data.tag}.`}
    lang={lang}
/>

<h1>{label} <q>{data.tag}</q>:</h1>
<RecipeSearchField {browse} {lang} recipeLang={data.recipeLang} />
<RecipeBrowse {browse} {lang} recipeLang={data.recipeLang} isLoggedIn={!!data.session?.user} />

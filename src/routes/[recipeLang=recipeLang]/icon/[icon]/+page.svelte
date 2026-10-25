<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    import IconLayout from '$lib/components/recipes/IconLayout.svelte';
    import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
    import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
    import Seo from '$lib/components/Seo.svelte';
    import { createRecipeBrowse } from '$lib/js/recipeBrowse.svelte';
    let { data }: { data: PageData } = $props();

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const siteTitle = $derived(t.site_title);

    // The pool is every recipe carrying this icon; the rail narrows within it.
    const browse = createRecipeBrowse(() => data.season);
</script>

<Seo
    title={`${data.icon} — ${siteTitle}`}
    description={`${t.icon_meta_prefix} ${data.icon}.`}
    lang={lang}
/>

<IconLayout icons={data.icons} active_icon={data.icon} routePrefix={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })}>
	{#snippet recipesSlot()}
		<RecipeSearchField {browse} {lang} recipeLang={data.recipeLang} />
		<RecipeBrowse
			{browse}
			{lang}
			recipeLang={data.recipeLang}
			isLoggedIn={!!data.session?.user}
			iconOverride={true}
		/>
	{/snippet}
</IconLayout>

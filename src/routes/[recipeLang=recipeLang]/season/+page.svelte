<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    import SeasonLayout from '$lib/components/recipes/SeasonLayout.svelte'
    import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
    import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
    import Seo from '$lib/components/Seo.svelte';
    import { createRecipeBrowse } from '$lib/js/recipeBrowse.svelte';
    let { data } = $props<{ data: PageData }>();
    let current_month = new Date().getMonth() + 1

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const isEnglish = $derived(lang === 'en');
    const months = $derived(isEnglish
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]);
    const labels = $derived({
        title: t.in_season_title,
        siteTitle: t.site_title
    });

    // The pool is what is in season today; the rail narrows within it.
    const browse = createRecipeBrowse(() => data.season);
</script>

<Seo
    title={`${labels.title} — ${labels.siteTitle}`}
    description={t.in_season_meta_description}
    lang={lang}
/>

<SeasonLayout active_index={current_month-1} {months} routePrefix={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })}>
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
</SeasonLayout>

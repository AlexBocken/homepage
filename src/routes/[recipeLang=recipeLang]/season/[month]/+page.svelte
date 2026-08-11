<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    import SeasonLayout from '$lib/components/recipes/SeasonLayout.svelte';
    import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
    import RecipeSearchField from '$lib/components/recipes/RecipeSearchField.svelte';
    import Seo from '$lib/components/Seo.svelte';
    import { createRecipeBrowse } from '$lib/js/recipeBrowse.svelte';
    let { data } = $props<{ data: PageData }>();

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const isEnglish = $derived(lang === 'en');
    const months = $derived(isEnglish
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]);
    const siteTitle = $derived(t.site_title);
    const currentMonth = $derived(months[data.month - 1]);

    // The pool is what is in season that month; the rail narrows within it.
    const browse = createRecipeBrowse(() => data.season);
</script>

<Seo
    title={`${currentMonth} — ${siteTitle}`}
    description={`${t.season_meta_prefix} ${currentMonth}.`}
    lang={lang}
/>

<SeasonLayout active_index={data.month -1} {months} routePrefix={resolve('/[recipeLang=recipeLang]', { recipeLang: data.recipeLang })}>
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

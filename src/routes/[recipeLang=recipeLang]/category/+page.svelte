<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    let { data } = $props<{ data: PageData }>();
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';
    import Seo from '$lib/components/Seo.svelte';

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const labels = $derived({
        title: t.categories_title,
        siteTitle: t.site_title
    });
</script>

<Seo
    title={`${labels.title} — ${labels.siteTitle}`}
    description={t.categories_meta_description}
    lang={lang}
/>
<h1 class="sr-only">{labels.title}</h1>
<section>
<TagCloud>
{#each data.categories as tag}
	<TagBall {tag} ref={resolve('/[recipeLang=recipeLang]/category', { recipeLang: data.recipeLang })}>
	</TagBall>
{/each}
</TagCloud>
</section>

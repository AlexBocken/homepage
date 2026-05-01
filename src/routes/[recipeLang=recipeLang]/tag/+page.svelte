<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
    let { data } = $props<{ data: PageData }>();
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';

    import { m, type RecipesLang } from '$lib/js/recipesI18n';
    const lang = $derived(data.lang as RecipesLang);
    const t = $derived(m[lang]);
    const labels = $derived({
        title: t.keywords_title,
        siteTitle: t.site_title,
        search: t.search_tags
    });

    let query = $state('');
    const filteredTags = $derived(
        query
            ? data.tags.filter((t: string) => t.toLowerCase().includes(query.toLowerCase()))
            : data.tags
    );
</script>

<svelte:head>
    <title>{labels.title} - {labels.siteTitle}</title>
</svelte:head>
<style>
	.search-wrap {
		max-width: 400px;
		margin: 0 auto 1rem;
		padding-inline: 1rem;
	}
	input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill, 999px);
		font-size: 0.9rem;
		background: var(--color-surface);
		color: var(--color-text-primary);
	}
</style>
<h1 class="sr-only">{labels.title}</h1>
<div class="search-wrap">
	<input type="search" placeholder={labels.search} bind:value={query} />
</div>
<section>
<TagCloud>
{#each filteredTags as tag}
	<TagBall {tag} ref={resolve('/[recipeLang=recipeLang]/tag', { recipeLang: data.recipeLang })}>
	</TagBall>
{/each}
</TagCloud>
</section>

<script lang="ts">
    import type { PageData } from './$types';
    let { data } = $props<{ data: PageData }>();
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';

    const isEnglish = $derived(data.lang === 'en');
    const labels = $derived({
        title: isEnglish ? 'Keywords' : 'Stichwörter',
        siteTitle: isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte',
        search: isEnglish ? 'Search tags...' : 'Tags suchen...'
    });

    let query = $state('');
    const filteredTags = $derived(
        query
            ? data.tags.filter(t => t.toLowerCase().includes(query.toLowerCase()))
            : data.tags
    );
</script>

<svelte:head>
    <title>{labels.title} - {labels.siteTitle}</title>
</svelte:head>
<style>
	h1 {
		font-size: 1.5rem;
		text-align: center;
	}
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
<h1>{labels.title}</h1>
<div class="search-wrap">
	<input type="search" placeholder={labels.search} bind:value={query} />
</div>
<section>
<TagCloud>
{#each filteredTags as tag}
	<TagBall {tag} ref="/{data.recipeLang}/tag">
	</TagBall>
{/each}
</TagCloud>
</section>

<script lang="ts">
    import type { PageData } from './$types';
    let { data } = $props<{ data: PageData }>();
    import "$lib/css/nordtheme.css";
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';

    const isEnglish = $derived(data.lang === 'en');
    const labels = $derived({
        title: isEnglish ? 'Keywords' : 'Stichwörter',
        siteTitle: isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte'
    });
</script>

<svelte:head>
    <title>{labels.title} - {labels.siteTitle}</title>
</svelte:head>
<style>
	h1 {
		font-size: 3rem;
		text-align: center;
	}
</style>
<h1>{labels.title}</h1>
<section>
<TagCloud>
{#each data.tags as tag}
	<TagBall {tag} ref="/{data.recipeLang}/tag">
	</TagBall>
{/each}
</TagCloud>
</section>

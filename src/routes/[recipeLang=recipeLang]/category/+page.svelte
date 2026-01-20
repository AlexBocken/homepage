<script lang="ts">
    import type { PageData } from './$types';
    import "$lib/css/nordtheme.css";
    let { data } = $props<{ data: PageData }>();
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';

    const isEnglish = $derived(data.lang === 'en');
    const labels = $derived({
        title: isEnglish ? 'Categories' : 'Kategorien',
        siteTitle: isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte'
    });
</script>

<svelte:head>
    <title>{labels.title} - {labels.siteTitle}</title>
</svelte:head>
<style>
	h1 {
		text-align: center;
		font-size: 3rem;
	}
</style>
<h1>{labels.title}</h1>
<section>
<TagCloud>
{#each data.categories as tag}
	<TagBall {tag} ref="/{data.recipeLang}/category">
	</TagBall>
{/each}
</TagCloud>
</section>

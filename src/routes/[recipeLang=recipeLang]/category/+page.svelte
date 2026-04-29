<script lang="ts">
    import { resolve } from '$app/paths';
    import type { PageData } from './$types';
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
<h1 class="sr-only">{labels.title}</h1>
<section>
<TagCloud>
{#each data.categories as tag}
	<TagBall {tag} ref={resolve('/[recipeLang=recipeLang]/category', { recipeLang: data.recipeLang })}>
	</TagBall>
{/each}
</TagCloud>
</section>

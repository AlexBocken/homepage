<script lang="ts">
    import type { PageData } from './$types';
    export let data: PageData;
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';
</script>
<h1>Rezepte</h1>
<h2>Kategorien</h2>
<section>
<TagCloud>
{#each data.categories as tag}
	<TagBall {tag} ref="/rezepte/category">
	</TagBall>
{/each}
</TagCloud>
</section>

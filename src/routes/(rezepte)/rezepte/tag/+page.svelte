<script lang="ts">
    import type { PageData } from './$types';
    export let data: PageData;
    import "$lib/css/nordtheme.css";
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';
</script>
<style>
	h1 {
		font-size: 3rem;
		text-align: center;
	}
</style>
<h1>Kategorien</h1>
<section>
<TagCloud>
{#each data.tags as tag}
	<TagBall {tag} ref="/rezepte/tag">
	</TagBall>
{/each}
</TagCloud>
</section>

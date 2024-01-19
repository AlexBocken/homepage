<script lang="ts">
    import type { PageData } from './$types';
    import "$lib/css/nordtheme.css";
    export let data: PageData;
    import TagCloud from '$lib/components/TagCloud.svelte';
    import TagBall from '$lib/components/TagBall.svelte';
</script>
<style>
	h1 {
		text-align: center;
		font-size: 3rem;
	}
</style>
<h1>Stichwörter</h1>
<section>
<TagCloud>
{#each data.categories as tag}
	<TagBall {tag} ref="/rezepte/category">
	</TagBall>
{/each}
</TagCloud>
</section>

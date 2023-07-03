<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import IconLayout from '$lib/components/IconLayout.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
</script>
<IconLayout icons={data.icons}>
<h2 slot=test>Rezepte mit {data.icon}</h2>
<Recipes slot=recipes>
	{#each data.season as recipe}
		<Card {recipe} icon_override=true></Card>
	{/each}
</Recipes>
</IconLayout>

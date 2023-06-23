<script lang="ts">
    import type { PageData } from './$types';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Recipes from '$lib/components/Recipes.svelte';
    import AddButton from '$lib/components/AddButton.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1
</script>

<h1>Rezepte</h1>
<h2>In Saison</h2>
<section>
<MediaScroller>
{#each data.season as recipe}
	<Card {recipe} {current_month} search=""></Card>
{/each}
</MediaScroller>
</section>
<Search></Search>
<h2>Alle Rezepte</h2>
<Recipes>
	{#each data.all_brief as recipe}
	<Card {recipe} {current_month}></Card>
	{/each}
</Recipes>
<AddButton></AddButton>

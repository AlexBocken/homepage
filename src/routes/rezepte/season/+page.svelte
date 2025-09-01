<script lang="ts">
    import type { PageData } from './$types';
    import '$lib/css/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte'
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1
    import { rand_array } from '$lib/js/randomize';
</script>

<SeasonLayout active_index={current_month-1}>
<Recipes slot=recipes>
	{#each rand_array(data.season) as recipe}
		<Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user}></Card>
	{/each}
</Recipes>
</SeasonLayout>

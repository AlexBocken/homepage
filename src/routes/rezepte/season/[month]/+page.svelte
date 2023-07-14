<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
    import { rand_array } from '$lib/js/randomize';
</script>
<SeasonLayout active_index={data.month -1}>
<Recipes slot=recipes>
	{#each rand_array(data.season) as recipe}
		<Card {recipe} icon_override=true></Card>
	{/each}
</Recipes>
</SeasonLayout>

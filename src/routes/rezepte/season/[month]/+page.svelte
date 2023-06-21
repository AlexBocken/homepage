<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
</script>
<SeasonLayout>
<h2 slot=test>Rezepte die im {months[data.month-1]} in Saison sind</h2>
<Recipes slot=recipes>
	{#each data.season as recipe}
		<Card {recipe} icon_override=true></Card>
	{/each}
</Recipes>
</SeasonLayout>

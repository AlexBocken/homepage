<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    let { data }: { data: PageData } = $props();

    const isEnglish = $derived(data.lang === 'en');
    const months = $derived(isEnglish
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]);

    import { rand_array } from '$lib/js/randomize';
</script>
<SeasonLayout active_index={data.month -1} {months} routePrefix="/{data.recipeLang}">
<Recipes slot=recipes>
	{#each rand_array(data.season) as recipe}
		<Card {recipe} icon_override=true isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
	{/each}
</Recipes>
</SeasonLayout>

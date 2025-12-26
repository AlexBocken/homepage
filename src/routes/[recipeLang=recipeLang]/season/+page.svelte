<script lang="ts">
    import type { PageData } from './$types';
    import '$lib/css/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import MediaScroller from '$lib/components/MediaScroller.svelte';
    import SeasonLayout from '$lib/components/SeasonLayout.svelte'
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    let { data }: { data: PageData } = $props();
    let current_month = new Date().getMonth() + 1
    import { rand_array } from '$lib/js/randomize';

    const isEnglish = $derived(data.lang === 'en');
    const months = $derived(isEnglish
        ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        : ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]);
</script>

<SeasonLayout active_index={current_month-1} {months} routePrefix="/{data.recipeLang}" lang={data.lang}>
<Recipes slot=recipes>
	{#each rand_array(data.season) as recipe}
		<Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
	{/each}
</Recipes>
</SeasonLayout>

<script lang="ts">
	import type { PageData } from './$types';
	import Recipes from '$lib/components/Recipes.svelte';
	import IconLayout from '$lib/components/IconLayout.svelte';
	import MediaScroller from '$lib/components/MediaScroller.svelte';
	import Card from '$lib/components/Card.svelte';
	import Search from '$lib/components/Search.svelte';
	export let data: PageData;
	import { rand_array } from '$lib/js/randomize';
</script>
<IconLayout icons={data.icons} active_icon={data.icon} >
<Recipes slot=recipes>
	{#each rand_array(data.season) as recipe}
		<Card {recipe} icon_override=true isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/recipes"></Card>
	{/each}
</Recipes>
</IconLayout>

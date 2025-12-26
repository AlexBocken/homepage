<script lang="ts">
    import type { PageData } from './$types';
    import Recipes from '$lib/components/Recipes.svelte';
    let { data }: { data: PageData } = $props();
    let current_month = new Date().getMonth() + 1;
    import Card from '$lib/components/Card.svelte'
    import Search from '$lib/components/Search.svelte';
    import { rand_array } from '$lib/js/randomize';

    const isEnglish = $derived(data.lang === 'en');
    const label = $derived(isEnglish ? 'Recipes with Keyword' : 'Rezepte mit Stichwort');
</script>
<style>
	h1 {
		text-align: center;
		font-size: 2em;
	}
</style>
<h1>{label} <q>{data.tag}</q>:</h1>
<Search tag={data.tag} lang={data.lang}></Search>
<section>
<Recipes>
	{#each rand_array(data.recipes) as recipe}
		<Card {recipe} {current_month} isFavorite={recipe.isFavorite} showFavoriteIndicator={!!data.session?.user} routePrefix="/{data.recipeLang}"></Card>
	{/each}
	</Recipes>
</section>

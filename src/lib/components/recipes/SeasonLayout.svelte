<script lang="ts">
    import type { Snippet } from 'svelte';
    import Recipes from '$lib/components/recipes/Recipes.svelte';
    import Search from './Search.svelte';

    let {
        months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        active_index,
        routePrefix = '/rezepte',
        lang = 'de',
        recipes = [],
        isLoggedIn = false,
        onSearchResults = (ids, categories) => {},
        recipesSlot
    }: {
        months?: string[],
        active_index: number,
        routePrefix?: string,
        lang?: string,
        recipes?: any[],
        isLoggedIn?: boolean,
        onSearchResults?: (ids: any[], categories: any[]) => void,
        recipesSlot?: Snippet
    } = $props();

    let month: number = $state();
</script>
<style>
a.month{
	text-decoration: unset;
	border-radius: var(--radius-pill);
	background-color: var(--color-primary);
	color: var(--color-text-on-primary);
	padding: 0.5em;
	transition: var(--transition-fast);
	min-width: 4em;
	text-align: center;
}
a.month:hover,
.active
{
	transform: scale(1.1,1.1) !important;
	background-color: var(--color-accent) !important;
}
.months{
	display:flex;
	flex-wrap:wrap;
	justify-content: center;
	gap: 1rem;
	margin-inline: auto;
	margin-block: 2rem;
}
</style>

<div class=months>
{#each months as month, i}
	<a class:active={i == active_index}  class=month href="{routePrefix}/season/{i+1}">{month}</a>
{/each}
</div>
<section>
<Search season={active_index + 1} {lang} {recipes} {isLoggedIn} {onSearchResults}></Search>
</section>
<section>
{@render recipesSlot?.()}
</section>

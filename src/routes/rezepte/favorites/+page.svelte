<script lang="ts">
    import type { PageData } from './$types';
    import '$lib/css/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import Card from '$lib/components/Card.svelte';
    import Search from '$lib/components/Search.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1;
</script>

<style>
h1{
    text-align: center;
    margin-bottom: 0;
    font-size: 4rem;
}
.subheading{
    text-align: center;
    margin-top: 0;
    font-size: 1.5rem;
}
.empty-state{
    text-align: center;
    margin-top: 3rem;
    color: var(--nord3);
}
</style>

<svelte:head>
    <title>Meine Favoriten - Bocken Rezepte</title>
    <meta name="description" content="Meine favorisierten Rezepte aus der Bockenschen Küche." />
</svelte:head>

<h1>Favoriten</h1>
<p class=subheading>
    {#if data.favorites.length > 0}
        {data.favorites.length} favorisierte Rezepte
    {:else}
        Noch keine Favoriten gespeichert
    {/if}
</p>

<Search favoritesOnly={true}></Search>

{#if data.error}
    <p class="empty-state">Fehler beim Laden der Favoriten: {data.error}</p>
{:else if data.favorites.length > 0}
    <Recipes>
        {#each data.favorites as recipe}
            <Card {recipe} {current_month} isFavorite={true} showFavoriteIndicator={true}></Card>
        {/each}
    </Recipes>
{:else}
    <div class="empty-state">
        <p>Du hast noch keine Rezepte als Favoriten gespeichert.</p>
        <p>Besuche ein <a href="/rezepte">Rezept</a> und klicke auf das Herz-Symbol, um es zu deinen Favoriten hinzuzufügen.</p>
    </div>
{/if}
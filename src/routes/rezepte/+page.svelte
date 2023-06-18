<script lang="ts">
    import type { PageData } from './$types';
    import './card.css';
    export let data: PageData;
    import Card from './Card.svelte'
    export let current_month = new Date().getMonth() + 1
</script>
<style>
.accordion{
	display:flex;
	background-color: #111111;
	flex-direction: row;
	margin-inline: auto;
	padding-inline: 1rem;
	padding-block: 3rem;
	margin-block: 3rem;
	align-items:center;
	justify-content: center;
	gap: 1rem;
}
</style>
<h1>Rezepte</h1>
<h2>In Saison</h2>
<section>
<div class=accordion>
{#each data.season as recipe}
	<Card {recipe} {current_month}></Card>
{/each}
</div>
</section>
<h2>Alle Rezepte</h2>
<div class=accordion>
{#each data.all_brief as recipe}
<Card {recipe} {current_month}></Card>
{/each}
</div>

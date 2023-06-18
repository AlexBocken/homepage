<script lang="ts">
    import type { PageData } from './$types';
    import '../../card.css';
    import Card from '../../Card.svelte';
    export let data: PageData;
    export let current_month = new Date().getMonth() + 1;
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
<h2>In Tag {data.tag}</h2>
<section>
<div class=accordion>
{#each data.recipes as recipe}
	<Card {recipe} {current_month}></Card>
{/each}
</div>
</section>

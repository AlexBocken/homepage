<script lang="ts">
    import '$lib/components/nordtheme.css';
    import Recipes from '$lib/components/Recipes.svelte';
    import Search from './Search.svelte';
    let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
    let month : number;
</script>

<style>
a.month{
	text-decoration: unset;
	font-family: sans-serif;
	border-radius: 1000px;
	background-color: var(--blue);
	color: var(--nord5);
	padding: 0.5em;
	transition: 100ms;
	min-width: 4em;
	text-align: center;
}
a.month:hover{
	transform: scale(1.1,1.1);
	background-color: var(--red);
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

<slot name="test"></slot>

<div class=months>
{#each months as month, i}
	<a class=month href="/rezepte/season/{i+1}">{month}</a>
{/each}
</div>
<section>
<Search></Search>
</section>
<section>
<slot name=recipes></slot>
</section>

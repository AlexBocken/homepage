<script>
export let data
</script>
<style>
*{
font-family: sans-serif;
}
.ingredients{
	flex-basis: 0;
	flex-grow: 1;
	padding-block: 1rem;
	padding-inline: 2rem;
}
.ingredients_grid{
	display: grid;
	font-size: 1.1rem;
	grid-template-columns: 1fr 3fr;
	grid-template-rows: auto;
	grid-auto-flow: row;
	row-gap: 0.5em;
	column-gap: 0.5em;
}
h4{
	margin-block: 0;
}
</style>
{#if data.ingredients}
<div class=ingredients>
{#if data.portions}
	<h3>Portionen:</h3>
	{data.portions}
{/if}
<h2>Zutaten</h2>
{#each data.ingredients as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<div class=ingredients_grid>
	{#each list.list as item}
		<div class=amount>{item.amount} {item.unit}</div><div class=name>{@html item.name}</div>
	{/each}
</div>
{/each}
</div>
{/if}

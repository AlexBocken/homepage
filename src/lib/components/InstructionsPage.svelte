<script>
let { data } = $props();

const isEnglish = $derived(data.lang === 'en');
const labels = $derived({
	preparation: isEnglish ? 'Preparation:' : 'Vorbereitung:',
	bulkFermentation: isEnglish ? 'Bulk Fermentation:' : 'Stockgare:',
	finalProof: isEnglish ? 'Final Proof:' : 'Stückgare:',
	baking: isEnglish ? 'Baking:' : 'Backen:',
	cooking: isEnglish ? 'Cooking:' : 'Kochen:',
	onThePlate: isEnglish ? 'On the Plate:' : 'Auf dem Teller:',
	instructions: isEnglish ? 'Instructions' : 'Zubereitung',
	at: isEnglish ? 'at' : 'bei'
});
</script>
<style>
*{
font-family: sans-serif;
}
ol li::marker{
	font-weight: bold;
	color: var(--blue);
	font-size: 1.2rem;
}
.instructions{
	flex-basis: 0;
	flex-grow: 2;
	background-color: var(--nord5);
	padding-block: 1rem;
	padding-inline: 2rem;
}
.instructions ol{
	padding-left: 1em;
}
.instructions li{
	margin-block: 0.5em;
	font-size: 1.1rem;

}

.additional_info{
	display: flex;
	flex-wrap: wrap;
	gap: 1em;
}
.additional_info > *{
	flex-grow: 0;
	padding: 1em;
	background-color: #FAFAFE;
	box-shadow: 0.3em 0.3em 1em 0.2em rgba(0,0,0,0.3);
	max-width: 30%
}
@media (prefers-color-scheme: dark){
	.instructions{
		background-color: var(--nord6-dark);
	}
	.additional_info > *{
		background-color: var(--accent-dark);
	}
}
@media screen and (max-width: 500px){
	.additional_info > *{
		max-width: 60%;
	}
}

h4{
	margin-block: 0;
}
</style>
<div class=instructions>
<div class=additional_info>
{#if data.preparation}
<div><h4>{labels.preparation}</h4>{data.preparation}</div>
{/if}


{#if data.fermentation}
	{#if data.fermentation.bulk}
		<div><h4>{labels.bulkFermentation}</h4>{data.fermentation.bulk}</div>
	{/if}

	{#if data.fermentation.final}
		<div><h4>{labels.finalProof}</h4> {data.fermentation.final}</div>
	{/if}
{/if}

{#if data.baking.temperature}
<div><h4>{labels.baking}</h4> {data.baking.length} {labels.at} {data.baking.temperature} °C {data.baking.mode}</div>
{/if}

{#if data.cooking}
<div><h4>{labels.cooking}</h4>{data.cooking}</div>
{/if}

{#if data.total_time}
<div><h4>{labels.onThePlate}</h4>{data.total_time}</div>
{/if}
</div>

{#if data.instructions}
<h2>{labels.instructions}</h2>
{#each data.instructions as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<ol>
	{#each list.steps as step}
		<li>{@html step}</li>
	{/each}
</ol>
{/each}
{/if}
</div>

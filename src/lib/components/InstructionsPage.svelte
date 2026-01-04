<script>
let { data } = $props();

let multiplier = $state(data.multiplier || 1);

// Flatten instruction references for display
const flattenedInstructions = $derived.by(() => {
	if (!data.instructions) return [];

	return data.instructions.flatMap((item) => {
		if (item.type === 'reference' && item.resolvedRecipe) {
			// Get translated or original instructions
			const lang = data.lang || 'de';
			const instructionsToUse = (lang === 'en' &&
									item.resolvedRecipe.translations?.en?.instructions)
				? item.resolvedRecipe.translations.en.instructions
				: item.resolvedRecipe.instructions || [];

			// Filter to only sections (not nested references)
			const baseInstructions = item.includeInstructions
				? instructionsToUse.filter(i => i.type === 'section' || !i.type)
				: [];

			// Combine all steps into one section
			const combinedSteps = [];

			// Add steps before
			if (item.stepsBefore && item.stepsBefore.length > 0) {
				combinedSteps.push(...item.stepsBefore);
			}

			// Add base recipe instructions
			baseInstructions.forEach(section => {
				if (section.steps) {
					combinedSteps.push(...section.steps);
				}
			});

			// Add steps after
			if (item.stepsAfter && item.stepsAfter.length > 0) {
				combinedSteps.push(...item.stepsAfter);
			}

			// Push as one section with optional label
			if (combinedSteps.length > 0) {
				return [{
					type: 'section',
					name: item.showLabel ? (item.labelOverride || item.resolvedRecipe.name) : '',
					steps: combinedSteps,
					isReference: item.showLabel,
					short_name: item.resolvedRecipe.short_name
				}];
			}

			return [];
		}

		// Regular section - pass through
		return [item];
	});
});

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

/* Base recipe reference link styling */
h3 a {
	color: var(--nord11);
	text-decoration: underline;
	text-decoration-color: var(--nord11);
}

h3 a:hover {
	color: var(--nord11);
	text-decoration: underline;
	text-decoration-color: var(--nord11);
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
{#each flattenedInstructions as list}
{#if list.name}
	{#if list.isReference}
		<h3><a href="{list.short_name}?multiplier={multiplier}">{@html list.name}</a></h3>
	{:else}
		<h3>{@html list.name}</h3>
	{/if}
{/if}
{#if list.steps}
<ol>
	{#each list.steps as step}
		<li>{@html step}</li>
	{/each}
</ol>
{/if}
{/each}
{/if}
</div>

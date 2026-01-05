<script>
let { data } = $props();

let multiplier = $state(data.multiplier || 1);

// Recursively flatten nested instruction references
function flattenInstructionReferences(items, lang, visited = new Set()) {
	const result = [];

	for (const item of items) {
		if (item.type === 'reference' && item.resolvedRecipe) {
			// Prevent circular references
			const recipeId = item.resolvedRecipe._id?.toString() || item.resolvedRecipe.short_name;
			if (visited.has(recipeId)) {
				console.warn('Circular reference detected:', recipeId);
				continue;
			}

			const newVisited = new Set(visited);
			newVisited.add(recipeId);

			// Get translated or original instructions
			const instructionsToUse = (lang === 'en' &&
									item.resolvedRecipe.translations?.en?.instructions)
				? item.resolvedRecipe.translations.en.instructions
				: item.resolvedRecipe.instructions || [];

			// Recursively flatten nested references
			const flattenedNested = flattenInstructionReferences(instructionsToUse, lang, newVisited);

			// Combine all steps into one list
			const combinedSteps = [];

			// Add steps before
			if (item.stepsBefore && item.stepsBefore.length > 0) {
				combinedSteps.push(...item.stepsBefore);
			}

			// Add base recipe instructions (now recursively flattened)
			if (item.includeInstructions) {
				flattenedNested.forEach(section => {
					if (section.steps) {
						combinedSteps.push(...section.steps);
					}
				});
			}

			// Add steps after
			if (item.stepsAfter && item.stepsAfter.length > 0) {
				combinedSteps.push(...item.stepsAfter);
			}

			// Push as one section with optional label
			if (combinedSteps.length > 0) {
				const baseRecipeName = (lang === 'en' && item.resolvedRecipe.translations?.en?.name)
					? item.resolvedRecipe.translations.en.name
					: item.resolvedRecipe.name;

				const baseRecipeShortName = (lang === 'en' && item.resolvedRecipe.translations?.en?.short_name)
					? item.resolvedRecipe.translations.en.short_name
					: item.resolvedRecipe.short_name;

				result.push({
					type: 'section',
					name: item.showLabel ? (item.labelOverride || baseRecipeName) : '',
					steps: combinedSteps,
					isReference: item.showLabel,
					short_name: baseRecipeShortName
				});
			}
		} else if (item.type === 'section' || !item.type) {
			// Regular section - pass through
			result.push(item);
		}
	}

	return result;
}

// Flatten instruction references for display
const flattenedInstructions = $derived.by(() => {
	if (!data.instructions) return [];
	const lang = data.lang || 'de';
	return flattenInstructionReferences(data.instructions, lang);
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

h3{
	margin-block: 0;
}

/* Base recipe reference link styling */
h3 a {
	color: var(--nord10);
	text-decoration: underline;
	text-decoration-color: var(--nord10);
}

h3 a:hover {
	color: var(--nord9);
	text-decoration: underline;
	text-decoration-color: var(--nord9);
}

@media (prefers-color-scheme: dark) {
	h3 a {
		color: var(--nord8);
		text-decoration-color: var(--nord8);
	}

	h3 a:hover {
		color: var(--nord7);
		text-decoration-color: var(--nord7);
	}
}
</style>
<div class=instructions>
<div class=additional_info>
{#if data.preparation}
<div><h3>{labels.preparation}</h3>{data.preparation}</div>
{/if}


{#if data.fermentation}
	{#if data.fermentation.bulk}
		<div><h3>{labels.bulkFermentation}</h3>{data.fermentation.bulk}</div>
	{/if}

	{#if data.fermentation.final}
		<div><h3>{labels.finalProof}</h3> {data.fermentation.final}</div>
	{/if}
{/if}

{#if data.baking.temperature}
<div><h3>{labels.baking}</h3> {data.baking.length} {labels.at} {data.baking.temperature} °C {data.baking.mode}</div>
{/if}

{#if data.cooking}
<div><h3>{labels.cooking}</h3>{data.cooking}</div>
{/if}

{#if data.total_time}
<div><h3>{labels.onThePlate}</h3>{data.total_time}</div>
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

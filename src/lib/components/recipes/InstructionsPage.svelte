<script>
import Timer from '@lucide/svelte/icons/timer';
import Wheat from '@lucide/svelte/icons/wheat';
import Croissant from '@lucide/svelte/icons/croissant';
import Flame from '@lucide/svelte/icons/flame';
import CookingPot from '@lucide/svelte/icons/cooking-pot';
import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
let { data } = $props();

// svelte-ignore state_referenced_locally
let multiplier = $state(data.multiplier || 1);

// Recursively flatten nested instruction references
/**
 * @param {any[]} items
 * @param {string} lang
 * @param {Set<string>} visited
 */
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

				const itemBaseMultiplier = item.baseMultiplier || 1;

				result.push({
					type: 'section',
					name: item.showLabel ? (item.labelOverride || baseRecipeName) : '',
					steps: combinedSteps,
					isReference: item.showLabel,
					short_name: baseRecipeShortName,
					baseMultiplier: itemBaseMultiplier
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
ol li::marker{
	font-weight: bold;
	color: var(--color-primary);
	font-size: 1.2rem;
}
.instructions{
	flex-basis: 0;
	flex-grow: 2;
	background-color: var(--color-bg-secondary);
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
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
	gap: 0.75rem;
}
.info-card{
	padding: 0.75rem 1rem;
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	box-shadow: var(--shadow-sm);
}
.info-card h3{
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin: 0 0 0.25rem 0;
	font-size: var(--text-sm);
	color: var(--color-text-secondary);
}
.info-value{
	font-size: 1rem;
	font-weight: 600;
	color: var(--color-text-primary);
}
</style>
<div class=instructions>
<div class="additional_info">
{#if data.preparation}
<div class="info-card"><h3><Timer size={16} />{labels.preparation}</h3><span class="info-value">{data.preparation}</span></div>
{/if}

{#if data.fermentation?.bulk}
<div class="info-card"><h3><Wheat size={16} />{labels.bulkFermentation}</h3><span class="info-value">{data.fermentation.bulk}</span></div>
{/if}

{#if data.fermentation?.final}
<div class="info-card"><h3><Croissant size={16} />{labels.finalProof}</h3><span class="info-value">{data.fermentation.final}</span></div>
{/if}

{#if data.baking?.temperature}
<div class="info-card"><h3><Flame size={16} />{labels.baking}</h3><span class="info-value">{data.baking.length} {labels.at} {data.baking.temperature} °C {data.baking.mode}</span></div>
{/if}

{#if data.cooking}
<div class="info-card"><h3><CookingPot size={16} />{labels.cooking}</h3><span class="info-value">{data.cooking}</span></div>
{/if}

{#if data.total_time}
<div class="info-card"><h3><UtensilsCrossed size={16} />{labels.onThePlate}</h3><span class="info-value">{data.total_time}</span></div>
{/if}
</div>

{#if data.instructions}
<h2>{labels.instructions}</h2>
{#each flattenedInstructions as list}
{#if list.name}
	{#if list.isReference}
		<h3><a href="{list.short_name}?multiplier={multiplier * (list.baseMultiplier || 1)}">{@html list.name}</a></h3>
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

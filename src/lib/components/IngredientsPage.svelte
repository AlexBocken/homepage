<script>
import { onMount } from 'svelte';
import { onNavigate } from "$app/navigation";
import { browser } from '$app/environment';
import { page } from '$app/stores';
import HefeSwapper from './HefeSwapper.svelte';

let { data } = $props();

// Flatten ingredient references for display
const flattenedIngredients = $derived.by(() => {
	if (!data.ingredients) return [];

	return data.ingredients.flatMap((item) => {
		if (item.type === 'reference' && item.resolvedRecipe) {
			const sections = [];

			// Get translated or original ingredients
			const lang = data.lang || 'de';
			const ingredientsToUse = (lang === 'en' &&
									item.resolvedRecipe.translations?.en?.ingredients)
				? item.resolvedRecipe.translations.en.ingredients
				: item.resolvedRecipe.ingredients || [];

			// Filter to only sections (not nested references)
			const baseIngredients = item.includeIngredients
				? ingredientsToUse.filter(i => i.type === 'section' || !i.type)
				: [];

			// Combine all items into one section
			const combinedList = [];

			// Add items before
			if (item.itemsBefore && item.itemsBefore.length > 0) {
				combinedList.push(...item.itemsBefore);
			}

			// Add base recipe ingredients
			baseIngredients.forEach(section => {
				if (section.list) {
					combinedList.push(...section.list);
				}
			});

			// Add items after
			if (item.itemsAfter && item.itemsAfter.length > 0) {
				combinedList.push(...item.itemsAfter);
			}

			// Push as one section with optional label
			if (combinedList.length > 0) {
				// Use labelOverride if present, otherwise use base recipe name (translated if viewing in English)
				const baseRecipeName = (lang === 'en' && item.resolvedRecipe.translations?.en?.name)
					? item.resolvedRecipe.translations.en.name
					: item.resolvedRecipe.name;

				sections.push({
					type: 'section',
					name: item.showLabel ? (item.labelOverride || baseRecipeName) : '',
					list: combinedList,
					isReference: item.showLabel,
					short_name: item.resolvedRecipe.short_name
				});
			}

			return sections;
		}

		// Regular section - pass through
		return [item];
	});
});
let multiplier = $state(data.multiplier || 1);

const isEnglish = $derived(data.lang === 'en');
const labels = $derived({
	portions: isEnglish ? 'Portions:' : 'Portionen:',
	adjustAmount: isEnglish ? 'Adjust Amount:' : 'Menge anpassen:',
	ingredients: isEnglish ? 'Ingredients' : 'Zutaten'
});

// Calculate yeast IDs for each yeast ingredient
const yeastIds = $derived.by(() => {
	const ids = {};
	let yeastCounter = 0;
	if (data.ingredients) {
		for (let listIndex = 0; listIndex < data.ingredients.length; listIndex++) {
			const list = data.ingredients[listIndex];
			if (list.list) {
				for (let ingredientIndex = 0; ingredientIndex < list.list.length; ingredientIndex++) {
					const ingredient = list.list[ingredientIndex];
					const nameLower = ingredient.name.toLowerCase();
					if (nameLower === "frischhefe" || nameLower === "trockenhefe" ||
					    nameLower === "fresh yeast" || nameLower === "dry yeast") {
						ids[`${listIndex}-${ingredientIndex}`] = yeastCounter++;
					}
				}
			}
		}
	}
	return ids;
});

// Get all current URL parameters to preserve state in multiplier forms
const currentParams = $derived(browser ? new URLSearchParams(window.location.search) : $page.url.searchParams);

// Progressive enhancement - use JS if available
onMount(() => {
	if (browser) {
		const urlParams = new URLSearchParams(window.location.search);
		multiplier = parseFloat(urlParams.get('multiplier')) || 1;
	}
})

onNavigate(() => {
	if (browser) {
		const urlParams = new URLSearchParams(window.location.search);
		multiplier = parseFloat(urlParams.get('multiplier')) || 1;
	}
})

function handleMultiplierClick(event, value) {
	if (browser) {
		event.preventDefault();
		multiplier = value;
		
		// Update URL without reloading
		const url = new URL(window.location);
		if (value === 1) {
			url.searchParams.delete('multiplier');
		} else {
			url.searchParams.set('multiplier', value);
		}
		window.history.replaceState({}, '', url);
	}
	// If no JS, form will submit normally
}

function handleCustomInput(event) {
	if (browser) {
		const value = parseFloat(event.target.value);
		if (!isNaN(value) && value > 0) {
			multiplier = value;
			
			// Update URL without reloading
			const url = new URL(window.location);
			if (value === 1) {
				url.searchParams.delete('multiplier');
			} else {
				url.searchParams.set('multiplier', value);
			}
			window.history.replaceState({}, '', url);
		}
	}
}

function handleCustomSubmit(event) {
	if (browser) {
		event.preventDefault();
		// Value already updated by handleCustomInput
	}
	// If no JS, form will submit normally
}


function convertFloatsToFractions(inputString) {
  // Split the input string into individual words
  const words = inputString.split(' ');

  // Define a helper function to check if a number is close to an integer
  const isCloseToInt = (num) => Math.abs(num - Math.round(num)) < 0.001;

  // Function to convert a float to a fraction
  const floatToFraction = (number) => {
    let bestNumerator = 0;
    let bestDenominator = 1;
    let minDifference = Math.abs(number);

    for (let denominator = 1; denominator <= 10; denominator++) {
      const numerator = Math.round(number * denominator);
      const difference = Math.abs(number - numerator / denominator);

      if (difference < minDifference) {
        bestNumerator = numerator;
        bestDenominator = denominator;
        minDifference = difference;
      }
    }

    if (bestDenominator == 1) return bestNumerator;
    else {
      let full_amount = Math.floor(bestNumerator / bestDenominator);
      if (full_amount > 0)
        return `${full_amount}<sup>${bestNumerator - full_amount * bestDenominator}</sup>/<sub>${bestDenominator}</sub>`;
      return `<sup>${bestNumerator}</sup>/<sub>${bestDenominator}</sub>`;
    }
  };

  // Iterate through the words and convert floats to fractions
  const result = words.map((word) => {
    // Check if the word contains a range (e.g., "300-400")
    if (word.includes('-')) {
      const rangeNumbers = word.split('-');
      const rangeFractions = rangeNumbers.map((num) => {
        const number = parseFloat(num);
        return !isNaN(number) ? floatToFraction(number) : num;
      });
      return rangeFractions.join('-');
    } else {
      const number = parseFloat(word);
      return !isNaN(number) ? floatToFraction(number) : word;
    }
  });

  // Join the words back into a string
  return result.join(' ');
}

function multiplyNumbersInString(inputString, constant) {
  return inputString.replace(/(\d+(?:[\.,]\d+)?)/g, match => {
    const number = match.includes(',') ? match.replace(/\./g, '').replace(',', '.') : match;
    const multiplied = (parseFloat(number) * constant).toString();
    const rounded = parseFloat(multiplied).toFixed(3);
    const trimmed = parseFloat(rounded).toString();
    return match.includes(',') ? trimmed.replace('.', ',') : trimmed;
  });
}

// "1-2 Kuchen (Durchmesser: 26cm", constant=2 ->  "2-4 Kuchen (Durchmesser: 26cm)"
function multiplyFirstAndSecondNumbers(inputString, constant) {
  const regex = /(\d+(?:[\.,]\d+)?)(\s*-\s*\d+(?:[\.,]\d+)?)?/;
  return inputString.replace(regex, (match, firstNumber, secondNumber) => {
    const numbersToMultiply = [firstNumber];
    if (secondNumber) {
      numbersToMultiply.push(secondNumber.replace(/-\s*/, ''));
    }
    const multipliedNumbers = numbersToMultiply.map(number => {
      const multiplied = (parseFloat(number) * constant).toString();
      const rounded = parseFloat(multiplied).toString();
      const result = number.includes(',') ? rounded.replace('.', ',') : rounded;
      return result;
    });
    return multipliedNumbers.join('-')
  });
}


function adjust_amount(string, multiplier){
	let temp = multiplyNumbersInString(string, multiplier)
	temp = convertFloatsToFractions(temp)
	return temp
}


// No need for complex yeast toggle handling - everything is calculated server-side now
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
.multipliers{
	display:flex;
	gap: 0.5rem;
	justify-content: center;
	flex-wrap:wrap;
}
.multipliers button{
	min-width: 2em;
	font-size: 1.1rem;
	border-radius: 0.3rem;
	border: none;
	cursor: pointer;
	transition: 100ms;
	color: var(--nord0);
	background-color: var(--nord5);
	box-shadow: 0px 0px 0.4em 0.05em rgba(0,0,0, 0.2);
}
@media (prefers-color-scheme: dark){
	.multipliers button{
		color: var(--tag-font);
		background-color: var(--nord6-dark);
	}
}
.multipliers :is(button, div):is(:hover, :focus-within){
	scale: 1.2;
	background-color: var(--orange);
	box-shadow: 0px 0px 0.5em 0.1em rgba(0,0,0, 0.3);
}
.selected{
	background-color: var(--nord9) !important;
	color: white !important;
	font-weight: bold;
	scale: 1.2 !important;
	box-shadow: 0px 0px 0.4em 0.1em rgba(0,0,0, 0.3) !important;
}
input.selected,
span.selected
{
	box-shadow: none !important;
	background-color: transparent;
	scale: 1 !important;
}
input,
span
{
	display: inline;
	flex-grow: 1;
	min-width: 1.5ch;
	background-color: transparent;
	border: unset;
	padding: 0;
	margin: 0;
}
.custom-multiplier {
	display: flex;
	align-items: center;
	min-width: 2em;
	font-size: 1.1rem;
	border-radius: 0.3rem;
	border: none;
	cursor: pointer;
	transition: 100ms;
	color: var(--nord0);
	background-color: var(--nord5);
	box-shadow: 0px 0px 0.4em 0.05em rgba(0,0,0, 0.2);
}

.custom-input {
	width: 3em;
	padding: 0;
	margin: 0;
	border: none;
	background: transparent;
	text-align: center;
	color: inherit;
	font-size: inherit;
	outline: none;
	box-shadow: none;
}

/* Remove number input arrows */
.custom-input::-webkit-outer-spin-button,
.custom-input::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

.custom-input[type=number] {
	-moz-appearance: textfield;
}

.custom-button {
	padding: 0;
	margin: 0;
	border: none;
	background: transparent;
	color: inherit;
	font-size: inherit;
	cursor: pointer;
	box-shadow: none;
}

@media (prefers-color-scheme: dark){
	.custom-multiplier {
		color: var(--tag-font);
		background-color: var(--nord6-dark);
	}
}

.custom-multiplier:hover,
.custom-multiplier:focus-within {
	scale: 1.2;
	background-color: var(--orange);
	box-shadow: 0px 0px 0.5em 0.1em rgba(0,0,0, 0.3);
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
{#if data.ingredients}
<div class=ingredients>
{#if data.portions}
	<h3>{labels.portions}</h3>
	{@html convertFloatsToFractions(multiplyFirstAndSecondNumbers(data.portions, multiplier))}
{/if}

<h3>{labels.adjustAmount}</h3>
<div class=multipliers>
	<form method="get" style="display: inline;">
		<input type="hidden" name="multiplier" value="0.5" />
		{#each Array.from(currentParams.entries()) as [key, value]}
			{#if key !== 'multiplier'}
				<input type="hidden" name={key} value={value} />
			{/if}
		{/each}
		<button type="submit" class:selected={multiplier==0.5} on:click={(e) => handleMultiplierClick(e, 0.5)}>{@html "<sup>1</sup>/<sub>2</sub>x"}</button>
	</form>
	<form method="get" style="display: inline;">
		<input type="hidden" name="multiplier" value="1" />
		{#each Array.from(currentParams.entries()) as [key, value]}
			{#if key !== 'multiplier'}
				<input type="hidden" name={key} value={value} />
			{/if}
		{/each}
		<button type="submit" class:selected={multiplier==1} on:click={(e) => handleMultiplierClick(e, 1)}>1x</button>
	</form>
	<form method="get" style="display: inline;">
		<input type="hidden" name="multiplier" value="1.5" />
		{#each Array.from(currentParams.entries()) as [key, value]}
			{#if key !== 'multiplier'}
				<input type="hidden" name={key} value={value} />
			{/if}
		{/each}
		<button type="submit" class:selected={multiplier==1.5} on:click={(e) => handleMultiplierClick(e, 1.5)}>{@html "<sup>3</sup>/<sub>2</sub>x"}</button>
	</form>
	<form method="get" style="display: inline;">
		<input type="hidden" name="multiplier" value="2" />
		{#each Array.from(currentParams.entries()) as [key, value]}
			{#if key !== 'multiplier'}
				<input type="hidden" name={key} value={value} />
			{/if}
		{/each}
		<button type="submit" class:selected={multiplier==2} on:click={(e) => handleMultiplierClick(e, 2)}>2x</button>
	</form>
	<form method="get" style="display: inline;">
		<input type="hidden" name="multiplier" value="3" />
		{#each Array.from(currentParams.entries()) as [key, value]}
			{#if key !== 'multiplier'}
				<input type="hidden" name={key} value={value} />
			{/if}
		{/each}
		<button type="submit" class:selected={multiplier==3} on:click={(e) => handleMultiplierClick(e, 3)}>3x</button>
	</form>
	<form method="get" style="display: inline;" class="custom-multiplier" on:submit={handleCustomSubmit}>
		{#each Array.from(currentParams.entries()) as [key, value]}
			{#if key !== 'multiplier'}
				<input type="hidden" name={key} value={value} />
			{/if}
		{/each}
		<input 
			type="text" 
			name="multiplier" 
			pattern="[0-9]+(\.[0-9]*)?" 
			title="Enter a positive number (e.g., 2.5, 0.75, 3.14)" 
			placeholder="…" 
			class="custom-input"
			value={multiplier != 0.5 && multiplier != 1 && multiplier != 1.5 && multiplier != 2 && multiplier != 3 ? multiplier : ''}
			on:input={handleCustomInput}
		/>
		<button type="submit" class="custom-button">x</button>
	</form>
</div>

<h2>{labels.ingredients}</h2>
{#each flattenedIngredients as list, listIndex}
{#if list.name}
	{#if list.isReference}
		<h3><a href="{list.short_name}?multiplier={multiplier}">{@html list.name}</a></h3>
	{:else}
		<h3>{@html list.name}</h3>
	{/if}
{/if}
{#if list.list}
<div class=ingredients_grid>
	{#each list.list as item, ingredientIndex}
		<div class=amount>{@html adjust_amount(item.amount, multiplier)} {item.unit}</div>
		<div class=name>
			{@html item.name.replace("{{multiplier}}", isNaN(parseFloat(item.amount)) ? multiplier : multiplier * parseFloat(item.amount))}
			{#if item.name.toLowerCase() === "frischhefe" || item.name.toLowerCase() === "trockenhefe" || item.name.toLowerCase() === "fresh yeast" || item.name.toLowerCase() === "dry yeast"}
				{@const yeastId = yeastIds[`${listIndex}-${ingredientIndex}`] ?? 0}
				<HefeSwapper {item} {multiplier} {yeastId} lang={data.lang} />
			{/if}
		</div>
	{/each}
</div>
{/if}
{/each}
</div>
{/if}

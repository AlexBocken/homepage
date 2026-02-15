<script>
import { onMount } from 'svelte';
import { onNavigate } from "$app/navigation";
import { browser } from '$app/environment';
import { page } from '$app/stores';
import HefeSwapper from './HefeSwapper.svelte';
let { data } = $props();

// Helper function to multiply numbers in ingredient amounts
function multiplyIngredientAmount(amount, multiplier) {
	if (!amount || multiplier === 1) return amount;
	return amount.replace(/(\d+(?:[\.,]\d+)?)/g, match => {
		const number = match.includes(',') ? match.replace(/\./g, '').replace(',', '.') : match;
		const multiplied = (parseFloat(number) * multiplier).toString();
		const rounded = parseFloat(multiplied).toFixed(3);
		const trimmed = parseFloat(rounded).toString();
		return match.includes(',') ? trimmed.replace('.', ',') : trimmed;
	});
}

// Recursively flatten nested ingredient references
function flattenIngredientReferences(items, lang, visited = new Set(), baseMultiplier = 1) {
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

			// Get translated or original ingredients
			const ingredientsToUse = (lang === 'en' &&
									item.resolvedRecipe.translations?.en?.ingredients)
				? item.resolvedRecipe.translations.en.ingredients
				: item.resolvedRecipe.ingredients || [];

			// Calculate combined multiplier for this reference
			const itemBaseMultiplier = item.baseMultiplier || 1;
			const combinedMultiplier = baseMultiplier * itemBaseMultiplier;

			// Recursively flatten nested references with the combined multiplier
			const flattenedNested = flattenIngredientReferences(ingredientsToUse, lang, newVisited, combinedMultiplier);

			// Combine all items into one list
			const combinedList = [];

			// Add items before (not affected by baseMultiplier)
			if (item.itemsBefore && item.itemsBefore.length > 0) {
				combinedList.push(...item.itemsBefore);
			}

			// Add base recipe ingredients (now recursively flattened with multiplier applied)
			if (item.includeIngredients) {
				flattenedNested.forEach(section => {
					if (section.list) {
						combinedList.push(...section.list);
					}
				});
			}

			// Add items after (not affected by baseMultiplier)
			if (item.itemsAfter && item.itemsAfter.length > 0) {
				combinedList.push(...item.itemsAfter);
			}

			// Push as one section with optional label
			if (combinedList.length > 0) {
				const baseRecipeName = (lang === 'en' && item.resolvedRecipe.translations?.en?.name)
					? item.resolvedRecipe.translations.en.name
					: item.resolvedRecipe.name;

				const baseRecipeShortName = (lang === 'en' && item.resolvedRecipe.translations?.en?.short_name)
					? item.resolvedRecipe.translations.en.short_name
					: item.resolvedRecipe.short_name;

				result.push({
					type: 'section',
					name: item.showLabel ? (item.labelOverride || baseRecipeName) : '',
					list: combinedList,
					isReference: item.showLabel,
					short_name: baseRecipeShortName,
					baseMultiplier: itemBaseMultiplier
				});
			}
		} else if (item.type === 'section' || !item.type) {
			// Regular section - pass through with multiplier applied to amounts
			if (baseMultiplier !== 1 && item.list) {
				const adjustedList = item.list.map(ingredient => ({
					...ingredient,
					amount: multiplyIngredientAmount(ingredient.amount, baseMultiplier)
				}));
				result.push({
					...item,
					list: adjustedList
				});
			} else {
				result.push(item);
			}
		}
	}

	return result;
}

// Flatten ingredient references for display
const flattenedIngredients = $derived.by(() => {
	if (!data.ingredients) return [];
	const lang = data.lang || 'de';
	return flattenIngredientReferences(data.ingredients, lang);
});
let multiplier = $state(data.multiplier || 1);

const isEnglish = $derived(data.lang === 'en');
const labels = $derived({
	portions: isEnglish ? 'Portions:' : 'Portionen:',
	adjustAmount: isEnglish ? 'Adjust Amount:' : 'Menge anpassen:',
	ingredients: isEnglish ? 'Ingredients' : 'Zutaten'
});

// Multiplier button options
const multiplierOptions = [
	{ value: 0.5, label: '<sup>1</sup>/<sub>2</sub>x' },
	{ value: 1, label: '1x' },
	{ value: 1.5, label: '<sup>3</sup>/<sub>2</sub>x' },
	{ value: 2, label: '2x' },
	{ value: 3, label: '3x' }
];

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
	display: flex;
	gap: 0.5rem;
	justify-content: center;
	flex-wrap: wrap;
}
/* Size overrides for multiplier buttons */
.multipliers button{
	min-width: 2em;
	font-size: 1.1rem;
	border-radius: var(--radius-sm);
}
/* Hover scale override - larger than default */
.multipliers :is(button, form):is(:hover, :focus-within){
	scale: 1.2;
	background-color: var(--nord8);
}
.selected{
	background-color: var(--nord9) !important;
	color: white !important;
	font-weight: bold;
	scale: 1.2 !important;
}
.custom-multiplier {
	display: flex;
	align-items: center;
	min-width: 2em;
	font-size: 1.1rem;
	border-radius: var(--radius-sm);
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

</style>
{#if data.ingredients}
<div class=ingredients>
{#if data.portions}
	<h3>{labels.portions}</h3>
	{@html convertFloatsToFractions(multiplyFirstAndSecondNumbers(data.portions, multiplier))}
{/if}

<h3>{labels.adjustAmount}</h3>
<form method="get" class="multipliers">
	{#each Array.from(currentParams.entries()) as [key, value]}
		{#if key !== 'multiplier'}
			<input type="hidden" name={key} {value} />
		{/if}
	{/each}
	{#each multiplierOptions as opt}
		<button type="submit" name="multiplier" value={opt.value} class="g-pill g-btn-light g-interactive" class:selected={multiplier === opt.value} onclick={(e) => handleMultiplierClick(e, opt.value)}>{@html opt.label}</button>
	{/each}
	<span class="custom-multiplier g-pill g-btn-light g-interactive">
		<input
			type="text"
			name="multiplier"
			pattern="[0-9]+(\.[0-9]*)?"
			title="Enter a positive number (e.g., 2.5, 0.75, 3.14)"
			placeholder="…"
			class="custom-input"
			value={!multiplierOptions.some(o => o.value === multiplier) ? multiplier : ''}
			oninput={handleCustomInput}
		/>
		<button type="submit" class="custom-button">x</button>
	</span>
</form>

<h2>{labels.ingredients}</h2>
{#each flattenedIngredients as list, listIndex}
{#if list.name}
	{#if list.isReference}
		<h3><a href="{list.short_name}?multiplier={multiplier * (list.baseMultiplier || 1)}">{@html list.name}</a></h3>
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

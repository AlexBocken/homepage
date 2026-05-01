<script>
import { onMount } from 'svelte';
import { onNavigate } from "$app/navigation";
import { browser } from '$app/environment';
import { page } from '$app/state';
import HefeSwapper from './HefeSwapper.svelte';
import NutritionSummary from './NutritionSummary.svelte';
import AddToFoodLogButton from './AddToFoodLogButton.svelte';
import { m } from '$lib/js/recipesI18n';
/** @typedef {import('$lib/js/recipesI18n').RecipesLang} RecipesLang */
let { data } = $props();
const isLoggedIn = $derived(!!data.session?.user);
const hasNutrition = $derived(!!data.nutritionMappings?.length);

// Helper function to multiply numbers in ingredient amounts
/** @param {string} amount @param {number} multiplier */
function multiplyIngredientAmount(amount, multiplier) {
	if (!amount || multiplier === 1) return amount;
	return amount.replace(/(\d+(?:[\.,]\d+)?)/g, (/** @type {string} */ match) => {
		const number = match.includes(',') ? match.replace(/\./g, '').replace(',', '.') : match;
		const multiplied = (parseFloat(number) * multiplier).toString();
		const rounded = parseFloat(multiplied).toFixed(3);
		const trimmed = parseFloat(rounded).toString();
		return match.includes(',') ? trimmed.replace('.', ',') : trimmed;
	});
}

// Recursively flatten nested ingredient references
/** @param {any[]} items @param {string} lang @param {Set<string>} [visited] @param {number} [baseMultiplier] */
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
				const adjustedList = item.list.map((/** @type {any} */ ingredient) => ({
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
// svelte-ignore state_referenced_locally
let multiplier = $state(data.multiplier || 1);

const lang = $derived(/** @type {RecipesLang} */ (data.lang));
const t = $derived(m[lang]);
const isEnglish = $derived(lang === 'en');
const labels = $derived({
	portions: t.portions,
	adjustAmount: t.adjust_amount,
	ingredients: t.ingredients,
	cakeForm: t.cake_form,
	adjustForm: t.adjust_cake_form,
	round: t.round_form,
	rectangular: t.rectangular_form,
	gugelhupf: 'Gugelhupf',
	diameter: t.diameter,
	outerDiameter: t.outer_diameter,
	innerDiameter: t.inner_diameter,
	width: t.width,
	length: t.length,
	factor: t.factor,
	restoreDefault: t.restore_default
});

// Cake form scaling
const hasDefaultForm = $derived(!!data.defaultForm?.shape);
// svelte-ignore state_referenced_locally
let userFormShape = $state(data.defaultForm?.shape || 'round');
// svelte-ignore state_referenced_locally
let userFormDiameter = $state(data.defaultForm?.diameter || 26);
// svelte-ignore state_referenced_locally
let userFormWidth = $state(data.defaultForm?.width || 20);
// svelte-ignore state_referenced_locally
let userFormLength = $state(data.defaultForm?.length || 30);
// svelte-ignore state_referenced_locally
let userFormInnerDiameter = $state(data.defaultForm?.innerDiameter || 8);

/** @param {string} shape @param {number} diameter @param {number} width @param {number} length @param {number} innerDiameter */
function calcArea(shape, diameter, width, length, innerDiameter) {
	if (shape === 'round') return Math.PI * (diameter / 2) ** 2;
	if (shape === 'gugelhupf') return Math.PI * ((diameter / 2) ** 2 - (innerDiameter / 2) ** 2);
	return width * length;
}

const defaultFormArea = $derived(
	hasDefaultForm
		? calcArea(data.defaultForm.shape, data.defaultForm.diameter, data.defaultForm.width, data.defaultForm.length, data.defaultForm.innerDiameter)
		: 1
);

const userFormArea = $derived(
	calcArea(userFormShape, userFormDiameter, userFormWidth, userFormLength, userFormInnerDiameter)
);

const formMultiplier = $derived(
	hasDefaultForm && defaultFormArea > 0 ? userFormArea / defaultFormArea : 1
);

// Effective multiplier consumed by ingredient/portion calculations.
// Base multiplier (pill buttons / custom input) stays independent of the
// cake-form scaling so the two factors are visually distinct.
const effectiveMultiplier = $derived(multiplier * formMultiplier);

let cakeFormExpanded = $state(false);

/** @param {string} shape */
function pickShape(shape) {
	userFormShape = shape;
}

const isDefaultForm = $derived(
	hasDefaultForm
	&& userFormShape === data.defaultForm.shape
	&& userFormDiameter === (data.defaultForm.diameter ?? 26)
	&& userFormWidth === (data.defaultForm.width ?? 20)
	&& userFormLength === (data.defaultForm.length ?? 30)
	&& userFormInnerDiameter === (data.defaultForm.innerDiameter ?? 8)
);

const cakeSummaryText = $derived.by(() => {
	if (userFormShape === 'round') return `${userFormDiameter} cm ${t.round_lowercase}`;
	if (userFormShape === 'rectangular') return `${userFormWidth}×${userFormLength} cm`;
	if (userFormShape === 'gugelhupf') return `${userFormDiameter}/${userFormInnerDiameter} cm Gugelhupf`;
	return '';
});

function resetCakeForm() {
	if (!data.defaultForm) return;
	userFormShape = data.defaultForm.shape || 'round';
	userFormDiameter = data.defaultForm.diameter || 26;
	userFormWidth = data.defaultForm.width || 20;
	userFormLength = data.defaultForm.length || 30;
	userFormInnerDiameter = data.defaultForm.innerDiameter || 8;
}

/** @param {number} value */
function updateUrl(value) {
	if (browser) {
		const url = new URL(window.location.href);
		if (value === 1) {
			url.searchParams.delete('multiplier');
		} else {
			url.searchParams.set('multiplier', String(value));
		}
		window.history.replaceState({}, '', url);
	}
}

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
	/** @type {Record<string, number>} */
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
const currentParams = $derived(browser ? new URLSearchParams(window.location.search) : page.url.searchParams);

// Progressive enhancement - use JS if available
onMount(() => {
	if (browser) {
		const urlParams = new URLSearchParams(window.location.search);
		multiplier = parseFloat(urlParams.get('multiplier') || '1') || 1;
	}
})

onNavigate(() => {
	if (browser) {
		const urlParams = new URLSearchParams(window.location.search);
		multiplier = parseFloat(urlParams.get('multiplier') || '1') || 1;
	}
})

/** @param {Event} event @param {number} value */
function handleMultiplierClick(event, value) {
	if (browser) {
		event.preventDefault();
		multiplier = value;
		updateUrl(value);
	}
	// If no JS, form will submit normally
}

/** @param {Event} event */
function handleCustomInput(event) {
	if (browser) {
		const value = parseFloat(/** @type {HTMLInputElement} */ (event.target).value);
		if (!isNaN(value) && value > 0) {
			multiplier = value;
			updateUrl(value);
		}
	}
}

/** @param {Event} event */
function handleCustomSubmit(event) {
	if (browser) {
		event.preventDefault();
		// Value already updated by handleCustomInput
	}
	// If no JS, form will submit normally
}


/** @param {string} inputString */
function convertFloatsToFractions(inputString) {
  // Split the input string into individual words
  const words = inputString.split(' ');

  // Define a helper function to check if a number is close to an integer
  const isCloseToInt = (/** @type {number} */ num) => Math.abs(num - Math.round(num)) < 0.001;

  // Function to convert a float to a fraction
  const floatToFraction = (/** @type {number} */ number) => {
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
  const result = words.map((/** @type {string} */ word) => {
    // Check if the word contains a range (e.g., "300-400")
    if (word.includes('-')) {
      const rangeNumbers = word.split('-');
      const rangeFractions = rangeNumbers.map((/** @type {string} */ num) => {
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

/** @param {string} inputString @param {number} constant */
function multiplyNumbersInString(inputString, constant) {
  return inputString.replace(/(\d+(?:[\.,]\d+)?)/g, (/** @type {string} */ match) => {
    const number = match.includes(',') ? match.replace(/\./g, '').replace(',', '.') : match;
    const multiplied = (parseFloat(number) * constant).toString();
    const rounded = parseFloat(multiplied).toFixed(3);
    const trimmed = parseFloat(rounded).toString();
    return match.includes(',') ? trimmed.replace('.', ',') : trimmed;
  });
}

// "1-2 Kuchen (Durchmesser: 26cm", constant=2 ->  "2-4 Kuchen (Durchmesser: 26cm)"
/** @param {string} inputString @param {number} constant */
function multiplyFirstAndSecondNumbers(inputString, constant) {
  const regex = /(\d+(?:[\.,]\d+)?)(\s*-\s*\d+(?:[\.,]\d+)?)?/;
  return inputString.replace(regex, (/** @type {string} */ match, /** @type {string} */ firstNumber, /** @type {string} */ secondNumber) => {
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


/** @param {string} string @param {number} multiplier */
function adjust_amount(string, multiplier){
	let temp = multiplyNumbersInString(string, multiplier)
	temp = convertFloatsToFractions(temp)
	return temp
}


// Collect section names for nutrition dedup (skip ingredients matching another section's name)
const nutritionSectionNames = $derived.by(() => {
	if (!data.ingredients) return new Set();
	const names = new Set();
	for (const section of data.ingredients) {
		if (section.name) {
			const stripped = section.name.replace(/<[^>]*>/g, '').toLowerCase().trim();
			if (stripped) names.add(stripped);
		}
	}
	return names;
});

// Build flat ingredient list with section/ingredient indices for nutrition calculator
const nutritionFlatIngredients = $derived.by(() => {
	if (!data.ingredients) return [];
	/** @type {{ name: string; unit: string; amount: string; sectionIndex: number; ingredientIndex: number; sectionName: string }[]} */
	const flat = [];
	for (let si = 0; si < data.ingredients.length; si++) {
		const section = data.ingredients[si];
		if (section.type === 'reference') continue;
		if (!section.list) continue;
		const sectionName = (section.name || '').replace(/<[^>]*>/g, '').toLowerCase().trim();
		for (let ii = 0; ii < section.list.length; ii++) {
			const item = section.list[ii];
			flat.push({
				name: item.name,
				unit: item.unit || '',
				amount: item.amount || '',
				sectionIndex: si,
				ingredientIndex: ii,
				sectionName,
			});
		}
	}
	return flat;
});

// No need for complex yeast toggle handling - everything is calculated server-side now
</script>
<style>
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
	background-color: var(--color-primary);
	color: var(--color-text-on-primary);
}
.selected{
	background-color: var(--color-primary) !important;
	color: var(--color-text-on-primary) !important;
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

.cake-form {
	margin-block: 1rem;
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	overflow: hidden;
	transition: border-color 150ms ease, box-shadow 150ms ease;
}
.cake-form:has(.cake-form-toggle[aria-expanded="true"]) {
	box-shadow: var(--shadow-sm);
}

.cake-form-toggle {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.75rem 1rem;
	background: transparent;
	border: none;
	cursor: pointer;
	font: inherit;
	color: inherit;
	text-align: left;
	transition: background-color 150ms ease;
}
.cake-form-toggle:hover,
.cake-form-toggle:focus-visible {
	background: var(--color-bg-elevated);
	outline: none;
}
.cake-form-toggle-label {
	display: flex;
	flex-direction: column;
	gap: 0.1rem;
	min-width: 0;
}
.cake-form-title {
	font-weight: 600;
	font-size: var(--text-sm);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color-text-secondary);
}
.cake-form-summary {
	font-size: 1rem;
	color: var(--color-text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.cake-form-toggle-right {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	flex-shrink: 0;
}
.cake-form-factor-badge {
	padding: 0.2rem 0.55rem;
	border-radius: var(--radius-pill);
	background: color-mix(in srgb, var(--color-primary) 18%, transparent);
	color: var(--color-primary);
	font-weight: 700;
	font-size: 0.85rem;
	letter-spacing: 0.02em;
}
.cake-form-chevron {
	width: 1rem;
	height: 1rem;
	color: var(--color-text-tertiary);
	transition: transform 200ms ease;
}
.cake-form-chevron.expanded {
	transform: rotate(180deg);
}

.cake-form-body {
	padding: 0.25rem 1rem 1rem;
	border-top: 1px solid var(--color-border);
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.cake-form-shape {
	display: flex;
	gap: 0.4rem;
	margin-top: 0.5rem;
}
.shape-tile {
	flex: 1 1 0;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 2.25rem;
	padding: 0;
	background: var(--color-bg-tertiary);
	border: 1.5px solid var(--color-border);
	border-radius: var(--radius-md);
	cursor: pointer;
	color: var(--color-text-secondary);
	transition: all 150ms ease;
}
.shape-tile:hover,
.shape-tile:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
	color: var(--color-text-primary);
	outline: none;
}
.shape-tile[aria-checked="true"] {
	border-color: var(--color-primary);
	background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg-tertiary));
	color: var(--color-primary);
}
.shape-tile svg {
	width: 1.25rem;
	height: 1.25rem;
	flex-shrink: 0;
}

.cake-form-inputs {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	gap: 0.75rem;
}
.input-wrap {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
}
.input-label {
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	color: var(--color-text-tertiary);
	text-transform: uppercase;
}
.input-box {
	position: relative;
	display: flex;
	align-items: center;
	background: var(--color-bg-tertiary);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input-box:focus-within {
	border-color: var(--color-primary);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
}
.input-box input {
	flex: 1;
	width: 100%;
	padding: 0.55rem 2.25rem 0.55rem 0.75rem;
	border: none;
	background: transparent;
	color: var(--color-text-primary);
	font: inherit;
	font-size: 1rem;
	outline: none;
}
.input-box input::-webkit-outer-spin-button,
.input-box input::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}
.input-box input[type="number"] {
	-moz-appearance: textfield;
	appearance: textfield;
}
.input-suffix {
	position: absolute;
	right: 0.75rem;
	font-size: 0.8rem;
	font-weight: 600;
	color: var(--color-text-tertiary);
	pointer-events: none;
	letter-spacing: 0.02em;
}

.cake-form-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding-top: 0.25rem;
}
.reset-link {
	background: none;
	border: none;
	padding: 0.25rem 0.5rem;
	font: inherit;
	font-size: 0.85rem;
	color: var(--color-text-tertiary);
	cursor: pointer;
	border-bottom: 1px dashed currentColor;
	border-radius: 0;
	transition: color 150ms ease;
}
.reset-link:hover,
.reset-link:focus-visible {
	color: var(--color-primary);
	outline: none;
}

@media (max-width: 560px) {
	.cake-form-toggle { padding: 0.65rem 0.75rem; }
	.cake-form-body { padding: 0.25rem 0.75rem 0.85rem; }
	.shape-tile { height: 2rem; }
	.shape-tile svg { width: 1.1rem; height: 1.1rem; }
	.cake-form-inputs { grid-template-columns: 1fr 1fr; }
}

</style>
{#if data.ingredients}
<div class=ingredients>
{#if data.portions}
	<h3>{labels.portions}</h3>
	{@html convertFloatsToFractions(multiplyFirstAndSecondNumbers(data.portions, effectiveMultiplier))}
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

{#if hasDefaultForm}
<div class="cake-form">
	<button
		type="button"
		class="cake-form-toggle"
		aria-expanded={cakeFormExpanded}
		aria-controls="cake-form-body"
		onclick={() => { cakeFormExpanded = !cakeFormExpanded; }}
	>
		<span class="cake-form-toggle-label">
			<span class="cake-form-title">{labels.adjustForm}</span>
			<span class="cake-form-summary">{cakeSummaryText}</span>
		</span>
		<span class="cake-form-toggle-right">
			{#if Math.abs(formMultiplier - 1) > 0.005}
				<span class="cake-form-factor-badge">{formMultiplier.toFixed(2)}×</span>
			{/if}
			<svg class="cake-form-chevron" class:expanded={cakeFormExpanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
		</span>
	</button>

	{#if cakeFormExpanded}
	<div id="cake-form-body" class="cake-form-body">
		<div class="cake-form-shape" role="radiogroup" aria-label={labels.cakeForm}>
			<button
				type="button"
				role="radio"
				aria-checked={userFormShape === 'round'}
				aria-label={labels.round}
				title={labels.round}
				class="shape-tile"
				onclick={() => pickShape('round')}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
					<circle cx="12" cy="12" r="8.5"/>
				</svg>
			</button>

			<button
				type="button"
				role="radio"
				aria-checked={userFormShape === 'rectangular'}
				aria-label={labels.rectangular}
				title={labels.rectangular}
				class="shape-tile"
				onclick={() => pickShape('rectangular')}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
					<rect x="3" y="6" width="18" height="12" rx="1.5"/>
				</svg>
			</button>

			{#if data.defaultForm?.shape === 'gugelhupf'}
			<button
				type="button"
				role="radio"
				aria-checked={userFormShape === 'gugelhupf'}
				aria-label={labels.gugelhupf}
				title={labels.gugelhupf}
				class="shape-tile"
				onclick={() => pickShape('gugelhupf')}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
					<circle cx="12" cy="12" r="8.5"/>
					<circle cx="12" cy="12" r="3"/>
				</svg>
			</button>
			{/if}
		</div>

		<div class="cake-form-inputs">
			{#if userFormShape === 'round'}
				<label class="input-wrap">
					<span class="input-label">{labels.diameter}</span>
					<span class="input-box">
						<input type="number" min="1" step="1" bind:value={userFormDiameter} />
						<span class="input-suffix">cm</span>
					</span>
				</label>
			{:else if userFormShape === 'rectangular'}
				<label class="input-wrap">
					<span class="input-label">{labels.width}</span>
					<span class="input-box">
						<input type="number" min="1" step="1" bind:value={userFormWidth} />
						<span class="input-suffix">cm</span>
					</span>
				</label>
				<label class="input-wrap">
					<span class="input-label">{labels.length}</span>
					<span class="input-box">
						<input type="number" min="1" step="1" bind:value={userFormLength} />
						<span class="input-suffix">cm</span>
					</span>
				</label>
			{:else if userFormShape === 'gugelhupf'}
				<label class="input-wrap">
					<span class="input-label">{labels.outerDiameter}</span>
					<span class="input-box">
						<input type="number" min="1" step="1" bind:value={userFormDiameter} />
						<span class="input-suffix">cm</span>
					</span>
				</label>
				<label class="input-wrap">
					<span class="input-label">{labels.innerDiameter}</span>
					<span class="input-box">
						<input type="number" min="1" step="1" bind:value={userFormInnerDiameter} />
						<span class="input-suffix">cm</span>
					</span>
				</label>
			{/if}
		</div>

		{#if !isDefaultForm}
		<div class="cake-form-footer">
			<button type="button" class="reset-link" onclick={resetCakeForm}>{labels.restoreDefault}</button>
		</div>
		{/if}
	</div>
	{/if}
</div>
{/if}

<h2>{labels.ingredients}</h2>
{#each flattenedIngredients as list, listIndex}
{#if list.name}
	{#if list.isReference}
		<h3><a href="{list.short_name}?multiplier={effectiveMultiplier * (list.baseMultiplier || 1)}">{@html list.name}</a></h3>
	{:else}
		<h3>{@html list.name}</h3>
	{/if}
{/if}
{#if list.list}
<div class=ingredients_grid>
	{#each list.list as item, ingredientIndex}
		<div class=amount>{@html adjust_amount(item.amount, effectiveMultiplier)} {item.unit}</div>
		<div class=name>
			{@html item.name.replace("{{multiplier}}", isNaN(parseFloat(item.amount)) ? effectiveMultiplier : effectiveMultiplier * parseFloat(item.amount))}
			{#if item.name.toLowerCase() === "frischhefe" || item.name.toLowerCase() === "trockenhefe" || item.name.toLowerCase() === "fresh yeast" || item.name.toLowerCase() === "dry yeast"}
				{@const yeastId = yeastIds[`${listIndex}-${ingredientIndex}`] ?? 0}
				<HefeSwapper {item} multiplier={effectiveMultiplier} {yeastId} lang={data.lang} />
			{/if}
		</div>
	{/each}
</div>
{/if}
{/each}

<NutritionSummary
	flatIngredients={nutritionFlatIngredients}
	nutritionMappings={data.nutritionMappings}
	sectionNames={nutritionSectionNames}
	referencedNutrition={data.referencedNutrition || []}
	multiplier={effectiveMultiplier}
	portions={data.portions}
	isEnglish={isEnglish}
>
	{#snippet actions()}
		{#if isLoggedIn && hasNutrition}
			<AddToFoodLogButton
				recipeName={data.strippedName || data.name}
				recipeId={data._id}
				nutritionMappings={data.nutritionMappings}
				referencedNutrition={data.referencedNutrition || []}
				ingredients={data.ingredients || []}
				portions={data.portions || ''}
				{isEnglish}
			/>
		{/if}
	{/snippet}
</NutritionSummary>
</div>
{/if}

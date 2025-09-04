<script>
import { onMount } from 'svelte';
import { onNavigate } from "$app/navigation";
import HefeSwapper from './HefeSwapper.svelte';
export let data
let multiplier;
let custom_mul = "…"

onMount(() => {
	// Apply multiplier from URL
	const urlParams = new URLSearchParams(window.location.search);
	multiplier = urlParams.get('multiplier') || 1;
})
onNavigate(() => {
	const urlParams = new URLSearchParams(window.location.search);
	multiplier = urlParams.get('multiplier') || 1;
})

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

function apply_if_not_NaN(custom){
	const multipliers = [0.5, 1, 1.5, 2, 3]
	if((!isNaN(custom * 1)) && custom != ""){
		if(multipliers.includes(parseFloat(custom))){
			multiplier = custom
			custom_mul = "…"
		}
		else{
			custom_mul = convertFloatsToFractions(custom)
			multiplier = custom
		}
	}
	else{
		custom_mul = "…"
	}
}

function handleHefeToggle(event, item) {
	item.name = event.detail.name;
	item.amount = event.detail.amount;
	if (event.detail.unit) {
		item.unit = event.detail.unit;
	}
	data = data; // Trigger reactivity
}
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
.multipliers button:last-child{
	display: flex;
	align-items: center;
}
</style>
{#if data.ingredients}
<div class=ingredients>
{#if data.portions}
	<h3>Portionen:</h3>
	{@html convertFloatsToFractions(multiplyFirstAndSecondNumbers(data.portions, multiplier))}
{/if}

<h3>Menge anpassen:</h3>
<div class=multipliers>
	<button class:selected={multiplier==0.5} on:click={() => multiplier=0.5}><sup>1</sup>&frasl;<sub>2</sub>x</button>
	<button class:selected={multiplier==1} on:click={() => {multiplier=1; custom_mul="…"}}>1x</button>
	<button class:selected={multiplier==1.5} on:click={() => {multiplier=1.5; custom_mul="…"}}><sup>3</sup>&frasl;<sub>2</sub>x</button>
	<button class:selected={multiplier==2} on:click="{() => {multiplier=2; custom_mul="…"}}">2x</button>
	<button class:selected={multiplier==3} on:click="{() => {multiplier=3; custom_mul="…"}}">3x</button>
	<button class:selected={multiplier==custom_mul} on:click={(e) => { const el = e.composedPath()[0].children[0]; if(el){ el.focus()}}}>
		<span class:selected={multiplier==custom_mul}
			on:focus={() => { custom_mul="" }
				}
			on:blur="{() => { apply_if_not_NaN(custom_mul);
					if(custom_mul == "")
						{custom_mul = "…"}
						}}"
					bind:innerHTML={custom_mul}
					contenteditable > </span>
		x
	</button>
</div>

<h2>Zutaten</h2>
{#each data.ingredients as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<div class=ingredients_grid>
	{#each list.list as item}
		<div class=amount>{@html adjust_amount(item.amount, multiplier)} {item.unit}</div>
		<div class=name>
			{@html item.name.replace("{{multiplier}}", multiplier * item.amount)}
			{#if item.name === "Frischhefe" || item.name === "Trockenhefe"}
				<HefeSwapper {item} {multiplier} on:toggle={(event) => handleHefeToggle(event, item)} />
			{/if}
		</div>
	{/each}
</div>
{/each}
</div>
{/if}

<script>
export let data
let multiplier = 1

//function multiplyNumbersInString(inputString, constant) {
//  return inputString.replace(/(\d+(?:[\.,]\d+)?)/g, match => {
//    const number = match.includes(',') ? match.replace(/\./g, '').replace(',', '.') : match;
//    const multiplied = (parseFloat(number) * constant).toString();
//    return match.includes(',') ? multiplied.replace('.', ',') : multiplied;
//  });
//}
function multiplyNumbersInString(inputString, constant) {
  return inputString.replace(/(\d+(?:[\.,]\d+)?)/g, match => {
    const number = match.includes(',') ? match.replace(/\./g, '').replace(',', '.') : match;
    const multiplied = (parseFloat(number) * constant).toString();
    const rounded = parseFloat(multiplied).toFixed(3);
    const trimmed = parseFloat(rounded).toString();
    return match.includes(',') ? trimmed.replace('.', ',') : trimmed;
  });
}


function convertFloatingPointToFraction(input) {
  const parts = input.split(/(\d*\.?\d+)/);

  return parts
    .map(part => {
      const number = parseFloat(part);

      if (!isNaN(number) && number % 1 !== 0) {
        const denominator = 10 ** number.toString().split('.')[1].length;
        const numerator = Math.round(number * denominator);

        if (numerator > 8 || denominator > 8) {
          const wholeNumber = Math.floor(numerator / denominator);
          const mixedNumerator = numerator % denominator;
          const gcd = findGCD(mixedNumerator, denominator);
          const simplifiedNumerator = mixedNumerator / gcd;
          const simplifiedDenominator = denominator / gcd;

          if (wholeNumber > 0) {
            return `${wholeNumber}<sup>${simplifiedNumerator}</sup>&frasl;<sub>${simplifiedDenominator}</sub>`;
          } else {
            return `<sup>${simplifiedNumerator}</sup>&frasl;<sub>${simplifiedDenominator}</sub>`;
          }
        }
      }

      return part;
    })
    .join('');
}

function findGCD(a, b) {
  if (b === 0) {
    return a;
  }
  return findGCD(b, a % b);
}

// For portions, not sure whether to keep or let it be
function multiplyFirstNumberInString(inputString, constant) {
  const firstNumberRegex = /\d+(?:[\.,]\d+)?/;
  const match = inputString.match(firstNumberRegex);
  if (match) {
    const number = match[0].includes(',') ? match[0].replace(/\./g, '').replace(',', '.') : match[0];
    const multiplied = (parseFloat(number) * constant).toString();
    const rounded = parseFloat(multiplied).toString();
    const result = match[0].includes(',') ? rounded.replace('.', ',') : rounded;
    return inputString.replace(firstNumberRegex, result);
  }
  return inputString;
}

function adjust_amount(string, multiplier){
	let temp = multiplyNumbersInString(string, multiplier)
	temp = convertFloatingPointToFraction(temp)
	return temp
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
}
.multipliers button{
	width: 2em;
	font-size: 1.1rem;
	border-radius: 0.3rem;
	border: none;
	cursor: pointer;
	transition: 100ms;
	color: var(--nord0);
	background-color: var(--nord5);
	box-shadow: 0px 0px 0.4em 0.05em rgba(0,0,0, 0.2);
}
.multipliers button:is(:hover, :focus-visible){
	scale: 1.2;
	background-color: var(--orange);
	box-shadow: 0px 0px 0.5em 0.1em rgba(0,0,0, 0.3);
}
button.selected{
	background-color: var(--nord9);
	color: white;
	font-weight: bold;
	scale: 1.1;
	box-shadow: 0px 0px 0.4em 0.1em rgba(0,0,0, 0.3);
}
</style>
{#if data.ingredients}
<div class=ingredients>
{#if data.portions}
	<h3>Portionen:</h3>
	{@html convertFloatingPointToFraction(multiplyFirstNumberInString(data.portions, multiplier))}
{/if}

<h3>Menge anpassen:</h3>
<div class=multipliers>
	<button class:selected={multiplier==0.5} on:click={() => multiplier=0.5}><sup>1</sup>&frasl;<sub>2</sub>x</button>
	<button class:selected={multiplier==1} on:click={() => multiplier=1}>1x</button>
	<button class:selected={multiplier==1.5} on:click={() => multiplier=1.5}><sup>3</sup>&frasl;<sub>2</sub>x</button>
	<button class:selected={multiplier==2} on:click="{() => multiplier=2}">2x</button>
	<button class:selected={multiplier==3} on:click="{() => multiplier=3}">3x</button>
</div>

<h2>Zutaten</h2>
{#each data.ingredients as list}
{#if list.name}
	<h3>{list.name}</h3>
{/if}
<div class=ingredients_grid>
	{#each list.list as item}
		<div class=amount>{@html adjust_amount(item.amount, multiplier)} {item.unit}</div><div class=name>{@html item.name}</div>
	{/each}
</div>
{/each}
</div>
{/if}

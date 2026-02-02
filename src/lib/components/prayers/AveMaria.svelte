<script lang="ts">
	import Prayer from './Prayer.svelte';

	let { mystery = "", mysteryLatin = "", mysteryEnglish = "" } = $props<{ mystery?: string, mysteryLatin?: string, mysteryEnglish?: string }>();
</script>

<Prayer>
	<p>
		<v lang="la">Ave <i><sup>⚬</sup></i>María, grátia plena. Dóminus tecum,</v>
		<v lang="de">Gegrüsset seist du <i><sup>⚬</sup></i>Maria, voll der Gnade; der Herr ist mit dir;</v>
		<v lang="en">Hail <i><sup>⚬</sup></i>Mary, full of grace. The Lord is with thee.</v>
		<v lang="la">benedícta tu in muliéribus,</v>
		<v lang="de">du bist gebenedeit unter den Frauen,</v>
		<v lang="en">Blessed art thou amongst women,</v>
		<v lang="la">et benedíctus fructus ventris tui, {#if !mysteryLatin}<i><sup>⚬</sup></i>Jesus.{/if}</v>
		<v lang="de">und gebenedeit ist die Frucht deines Leibes, {#if !mystery}<i><sup>⚬</sup></i>Jesus.{/if}</v>
		<v lang="en">and blessed is the fruit of thy womb, {#if !mysteryEnglish}<i><sup>⚬</sup></i>Jesus.{/if}</v>
		{#if mysteryLatin}
			<v lang="la" class="mystery-text"><i><sup>⚬</sup></i>{mysteryLatin}</v>
		{/if}
		{#if mystery}
			<v lang="de" class="mystery-text"><i><sup>⚬</sup></i>{mystery}</v>
		{/if}
		{#if mysteryEnglish}
			<v lang="en" class="mystery-text"><i><sup>⚬</sup></i>{mysteryEnglish}</v>
		{/if}
	</p>
	<p>
		<v lang="la">Sancta <i><sup>⚬</sup></i>María, mater Dei, ora pro nobis peccatóribus,</v>
		<v lang="de">Heilige <i><sup>⚬</sup></i>Maria, Mutter Gottes, bitte für uns Sünder</v>
		<v lang="en">Holy <i><sup>⚬</sup></i>Mary, Mother of God, pray for us sinners,</v>
		<v lang="la">nunc, et in hora mortis nostræ. Amen.</v>
		<v lang="de">jetzt und in der Stunde unseres Todes. Amen.</v>
		<v lang="en">now and at the hour of our death. Amen.</v>
	</p>
</Prayer>

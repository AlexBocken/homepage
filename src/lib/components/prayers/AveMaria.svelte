<script lang="ts">
	import Prayer from './Prayer.svelte';

	let { mystery = "", mysteryLatin = "" } = $props<{ mystery?: string, mysteryLatin?: string }>();
</script>

<Prayer>
	<p>
		<v lang="la">Ave María, grátia plena. Dóminus tecum,</v>
		<v lang="de">Gegrüsset seist du Maria, voll der Gnade; der Herr ist mit dir;</v>
		<v lang="la">benedícta tu in muliéribus,</v>
		<v lang="de">du bist gebenedeit unter den Frauen,</v>
		<v lang="la">et benedíctus fructus ventris tui, {#if !mysteryLatin}Jesus.{/if}</v>
		<v lang="de">und gebenedeit ist die Frucht deines Leibes, {#if !mystery}Jesus.{/if}</v>
		{#if mysteryLatin}
			<v lang="la" class="mystery-text">{mysteryLatin}</v>
		{/if}
		{#if mystery}
			<v lang="de" class="mystery-text">{mystery}</v>
		{/if}
	</p>
	<p>
		<v lang="la">Sancta María, mater Dei, ora pro nobis peccatóribus,</v>
		<v lang="de">Heilige Maria, Mutter Gottes, bitte für uns Sünder</v>
		<v lang="la">nunc, et in hora mortis nostræ. Amen.</v>
		<v lang="de">jetzt und in der Stunde unseres Todes! Amen.</v>
	</p>
</Prayer>

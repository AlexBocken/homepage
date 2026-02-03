<script lang="ts">
	import Prayer from './Prayer.svelte';

	let { mystery = "", mysteryLatin = "", mysteryEnglish = "" } = $props<{ mystery?: string, mysteryLatin?: string, mysteryEnglish?: string }>();
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Ave <i><sup>⚬</sup></i>María, grátia plena. Dóminus tecum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gegrüsset seist du <i><sup>⚬</sup></i>Maria, voll der Gnade; der Herr ist mit dir;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Hail <i><sup>⚬</sup></i>Mary, full of grace. The Lord is with thee.</v>{/if}
		{#if showLatin}<v lang="la">benedícta tu in muliéribus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">du bist gebenedeit unter den Frauen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Blessed art thou amongst women,</v>{/if}
		{#if showLatin}<v lang="la">et benedíctus fructus ventris tui, {#if !mysteryLatin}<i><sup>⚬</sup></i>Jesus.{/if}</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und gebenedeit ist die Frucht deines Leibes, {#if !mystery}<i><sup>⚬</sup></i>Jesus.{/if}</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and blessed is the fruit of thy womb, {#if !mysteryEnglish}<i><sup>⚬</sup></i>Jesus.{/if}</v>{/if}
		{#if showLatin && mysteryLatin}
			<v lang="la" class="mystery-text"><i><sup>⚬</sup></i>{mysteryLatin}</v>
		{/if}
		{#if urlLang === 'de' && mystery}
			<v lang="de" class="mystery-text"><i><sup>⚬</sup></i>{mystery}</v>
		{/if}
		{#if urlLang === 'en' && mysteryEnglish}
			<v lang="en" class="mystery-text"><i><sup>⚬</sup></i>{mysteryEnglish}</v>
		{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Sancta <i><sup>⚬</sup></i>María, mater Dei, ora pro nobis peccatóribus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Heilige <i><sup>⚬</sup></i>Maria, Mutter Gottes, bitte für uns Sünder</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Holy <i><sup>⚬</sup></i>Mary, Mother of God, pray for us sinners,</v>{/if}
		{#if showLatin}<v lang="la">nunc, et in hora mortis nostræ. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">jetzt und in der Stunde unseres Todes. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">now and at the hour of our death. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

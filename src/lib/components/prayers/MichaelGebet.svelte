<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Sáncte Míchael Archángele,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Heiliger Erzengel Michael,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Saint Michael the Archangel,</v>{/if}
		{#if showLatin}<v lang="la">defénde nos in proélio,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">verteidige uns im Kampfe!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">defend us in battle.</v>{/if}
		{#if showLatin}<v lang="la">cóntra nequítam et insídias</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gegen die Bosheit und Nachstellungen</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Be our protection against the wickedness</v>{/if}
		{#if showLatin}<v lang="la">diáboli ésto præsídium.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">des Teufels sei unser Schutz. </v>{/if}
		{#if urlLang === 'en'}<v lang="en">and snares of the devil.</v>{/if}
		{#if showLatin}<v lang="la">Ímperet ílli Déus, súpplices deprecámur:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">»Gott gebiete ihm!«, so bitten wir flehentlich.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">May God rebuke him, we humbly pray;</v>{/if}
		{#if showLatin}<v lang="la">tuque, Prínceps milítæ cæléstis,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du aber, Fürst der himmlischen Heerscharen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and do thou, O Prince of the heavenly host,</v>{/if}
		{#if showLatin}<v lang="la">Sátanam aliósque spíritus malígnos,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">stosse den Satan und die anderen bösen Geister,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">by the power of God, thrust into hell Satan</v>{/if}
		{#if showLatin}<v lang="la">qui ad perditiónem animárum</v>{/if}
		{#if showLatin}<v lang="la">pervagántur in múndo,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die in der Welt umhergehen,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">um die Seelen zu verderben,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and all the evil spirits</v>{/if}
		{#if urlLang === 'en'}<v lang="en">who prowl about the world seeking the ruin of souls.</v>{/if}
		{#if showLatin}<v lang="la">divína virtúte, in inférnum detrúde. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">durch die Kraft Gottes in die Hölle. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

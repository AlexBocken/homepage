<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Mí <i><sup>⚬</sup></i>Jésú, indúlge peccáta nostra,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O mein <i><sup>⚬</sup></i>Jesus, verzeih' uns unsere Sünden,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O my <i><sup>⚬</sup></i>Jesus, forgive us our sins,</v>{/if}
		{#if showLatin}<v lang="la">præsérva nos ab igne inférni,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">bewahre uns vor den Feuern der Hölle</v>{/if}
		{#if urlLang === 'en'}<v lang="en">save us from the fires of hell,</v>{/if}
		{#if showLatin}<v lang="la">duc omnes ad cæli glóriam, </v>{/if}
		{#if urlLang === 'de'}<v lang="de">und führe alle Seelen in den Himmel,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and lead all souls to heaven,</v>{/if}
		{#if showLatin}<v lang="la">præcípe tua</v>{/if}
		{#if urlLang === 'de'}<v lang="de">besonders jene,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">especially those</v>{/if}
		{#if showLatin}<v lang="la">misericórdia máxime egéntes. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die Deiner Barmherzigkeit am meisten bedürfen. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">who are in most need of Thy mercy. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

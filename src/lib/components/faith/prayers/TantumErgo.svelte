<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Tantum ergo Sacraméntum</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Darum lasst uns tief verehren</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Therefore so great a Sacrament</v>{/if}
		{#if showLatin}<v lang="la">venerémur cérnui:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">ein so grosses Sakrament;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">let us venerate with bowed heads;</v>{/if}
		{#if showLatin}<v lang="la">et antíquum documéntum</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dieser Bund soll ewig währen</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and the old rite</v>{/if}
		{#if showLatin}<v lang="la">novo cedat rítui:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und den neuen Bund ersetzt.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">give way to the new:</v>{/if}
		{#if showLatin}<v lang="la">præstet fides suppleméntum</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Unser Glaube soll uns lehren,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">let faith provide a supplement</v>{/if}
		{#if showLatin}<v lang="la">sénsuum deféctui.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">was das Auge nicht erkennt.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">for the failure of the senses.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Genitóri, Genitóque</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gott dem Vater und dem Sohne</v>{/if}
		{#if urlLang === 'en'}<v lang="en">To the Begetter and the Begotten</v>{/if}
		{#if showLatin}<v lang="la">laus et iubilátio,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">sei Lob und Preis und Ehre,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">be praise and jubilation,</v>{/if}
		{#if showLatin}<v lang="la">salus, honor, virtus quoque</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Heil und Ruhm und Macht und Wonne</v>{/if}
		{#if urlLang === 'en'}<v lang="en">salvation, honour, virtue also</v>{/if}
		{#if showLatin}<v lang="la">sit et benedíctio:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und Segen immerdar,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and blessing too:</v>{/if}
		{#if showLatin}<v lang="la">procedénti ab utróque</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und dem der von beiden ausgeht,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to Him proceeding from both</v>{/if}
		{#if showLatin}<v lang="la">compar sit laudátio. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">sei gleiche Ehre. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">let there be equal praise. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

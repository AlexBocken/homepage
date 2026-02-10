<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Orémus:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Lasset uns beten:</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Let us pray:</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Déus, cújus Unigénitus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O Gott, dessen eingeborner Sohn</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O God, whose only begotten Son,</v>{/if}
		{#if showLatin}<v lang="la">pér vítam, mórtem ét resurrectiónem súam</v>{/if}
		{#if urlLang === 'de'}<v lang="de">durch sein Leben, seinen Tod und seine Auferstehung</v>{/if}
		{#if urlLang === 'en'}<v lang="en">by His life, death, and resurrection,</v>{/if}
		{#if showLatin}<v lang="la">nóbis salútis ætérnæ præmia comparávit:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">uns die Belohnung des ewigen Lebens verdient hat,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">has purchased for us the rewards of eternal life:</v>{/if}
		{#if showLatin}<v lang="la">concéde, quæsumus;</v>{/if}
		{#if urlLang === 'de'}<v lang="de">verleihe uns, wir bitten dich,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">grant, we beseech Thee,</v>{/if}
		{#if showLatin}<v lang="la">út, hæc mystéria sanctíssimo beátæ Maríæ Vírginis Rosário recoléntes;</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dass wir, indem wir die Geheimisse des heiligen Rosenkranzes der allerseligsten Jungfrau ehren,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">that by meditating on these mysteries of the most holy Rosary of the Blessed Virgin Mary,</v>{/if}
		{#if showLatin}<v lang="la">ét imitémur quód cóntinent,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">was sie enthalten nachahmen</v>{/if}
		{#if urlLang === 'en'}<v lang="en">we may imitate what they contain</v>{/if}
		{#if showLatin}<v lang="la">ét quód promíttunt, assequámur.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und dadurch erlangen, was uns in denselben verheissen ist.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and obtain what they promise.</v>{/if}
		{#if showLatin}<v lang="la">Pér eúmdem Chrístum Dóminum nóstrum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Durch unsern Herrn <i><sup>⚬</sup></i>Jesus Christus.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Through the same Christ our Lord.</v>{/if}
		{#if showLatin}<v lang="la">Ámen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

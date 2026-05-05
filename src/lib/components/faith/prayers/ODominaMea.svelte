<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">O Dómina mea, o Mater mea, tibi me totum óffero,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O meine Gebieterin, o meine Mutter! Dir bringe ich mich ganz dar;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O my Queen, O my Mother, I give myself entirely to thee;</v>{/if}
		{#if showLatin}<v lang="la">atque, ut me tibi probem devótum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und um dir meine Hingabe zu bezeigen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and to show my devotion to thee,</v>{/if}
		{#if showLatin}<v lang="la">cónsecro tibi hódie óculos meos, aures meas, os meum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">weihe ich dir heute meine Augen, meine Ohren, meinen Mund,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I consecrate to thee this day my eyes, my ears, my mouth,</v>{/if}
		{#if showLatin}<v lang="la">cor meum, plane me totum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">mein Herz, mich selber ganz und gar.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">my heart, my whole being without reserve.</v>{/if}
		{#if showLatin}<v lang="la">Quóniam ítaque tuus sum, o bona Mater,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Weil ich also dir gehöre, o gute Mutter,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Wherefore, good Mother, as I am thine own,</v>{/if}
		{#if showLatin}<v lang="la">serva me, defénde me, ut rem ac possessiónem tuam.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">bewahre mich und beschütze mich als dein Gut und dein Eigentum.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">keep me, defend me, as thy property and possession.</v>{/if}
		<v lang="und">Amen.</v>
	</p>
	{/snippet}
</Prayer>

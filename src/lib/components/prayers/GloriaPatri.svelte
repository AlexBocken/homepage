<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la"><i><sup>⚬</sup></i>Glória Patri, et Fílio, et Spirítui Sancto.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i><sup>⚬</sup></i>Ehre sei dem Vater und dem Sohne und dem Hl. Geiste.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i><sup>⚬</sup></i>Glory be to the Father, and to the Son, and to the Holy Spirit.</v>{/if}
		{#if showLatin}<v lang="la">Sicut erat in princípio, et nunc, et semper:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Wie es war am Anfang, so auch jetzt und allezeit</v>{/if}
		{#if urlLang === 'en'}<v lang="en">As it was in the beginning, is now, and ever shall be,</v>{/if}
		{#if showLatin}<v lang="la">et in sǽcula sæculórum. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und in Ewigkeit. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">world without end. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

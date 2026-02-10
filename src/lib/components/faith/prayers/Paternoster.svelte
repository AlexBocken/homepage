<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Pater noster, qui es in cælis</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Vater unser, der Du bist im Himmel,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Our Father, Who art in heaven,</v>{/if}
		{#if showLatin}<v lang="la">Sanctificétur nomen tuum</v>{/if}
		{#if urlLang === 'de'}<v lang="de">geheiligt werde Dein Name;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">hallowed be Thy name;</v>{/if}
		{#if showLatin}<v lang="la">Advéniat regnum tuum</v>{/if}
		{#if urlLang === 'de'}<v lang="de">zu uns komme Dein Reich;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thy kingdom come;</v>{/if}
		{#if showLatin}<v lang="la">Fiat volúntas tua, sicut in cælo, et in terra.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Dein Wille geschehe, wie im Himmel, also auch auf Erden!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thy will be done on earth as it is in heaven.</v>{/if}
		{#if showLatin}<v lang="la">Panem nostrum quotidiánum da nobis hódie.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Unser tägliches Brot gib uns heute;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Give us this day our daily bread;</v>{/if}
		{#if showLatin}<v lang="la">Et dimítte nobis debíta nostra,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und vergib uns unsere Schulden,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and forgive us our trespasses,</v>{/if}
		{#if showLatin}<v lang="la">sicut et nos dimíttimus debitóribus nostris.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">wie auch wir vergeben unsern Schuldigern;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">as we forgive those who trespass against us;</v>{/if}
		{#if showLatin}<v lang="la">Et ne nos indúcas in tentatiónem.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und führe uns nicht in Versuchung.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and lead us not into temptation,</v>{/if}
		{#if showLatin}<v lang="la">Sed líbera nos a malo. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Sondern erlöse uns von dem Übel. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">but deliver us from evil. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

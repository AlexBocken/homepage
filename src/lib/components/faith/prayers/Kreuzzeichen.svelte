<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">In nómine <i>♱</i> Patris, et Fílii, et Spíritus Sancti. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Im Namen des <i>♱</i> Vaters und des Sohnes und des Heiligen Geistes. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">In the name of the <i>♱</i> Father, and of the Son, and of the Holy Spirit. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

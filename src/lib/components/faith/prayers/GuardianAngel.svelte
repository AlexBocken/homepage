<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Ángele Dei,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Engel Gottes,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Angel of God,</v>{/if}
		{#if showLatin}<v lang="la">qui custos es mei,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">mein Beschützer,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">my guardian dear,</v>{/if}
		{#if showLatin}<v lang="la">me, tibi commíssum pietáte supérna,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dir hat Gottes Vorsehung mich anvertraut;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to whom God's love commits me here,</v>{/if}
		{#if showLatin}<v lang="la">illúmina, custódi, rege et gubérna.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">erleuchte, beschütze, leite und führe mich.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">ever this day be at my side, to light and guard, to rule and guide.</v>{/if}
		{#if showLatin}<v lang="la">Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

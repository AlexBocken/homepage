<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if urlLang === 'de'}<v lang="de">Mein Herr und mein Gott,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">My Lord and my God,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">nimm alles von mir,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">take from me everything</v>{/if}
		{#if urlLang === 'de'}<v lang="de">was mich hindert zu Dir.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">that distances me from Thee.</v>{/if}
	</p>
	<p>
		{#if urlLang === 'de'}<v lang="de">Mein Herr und mein Gott,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">My Lord and my God,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">gib alles mir,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">give me everything</v>{/if}
		{#if urlLang === 'de'}<v lang="de">was mich führet zu Dir.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">that brings me closer to Thee.</v>{/if}
	</p>
	<p>
		{#if urlLang === 'de'}<v lang="de">Mein Herr und mein Gott,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">My Lord and my God,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">nimm mich mir</v>{/if}
		{#if urlLang === 'en'}<v lang="en">detach me from myself</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und gib mich ganz zu eigen Dir.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to give my all to Thee.</v>{/if}
	</p>
	{/snippet}
</Prayer>

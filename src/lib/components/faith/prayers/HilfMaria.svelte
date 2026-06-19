<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if urlLang === 'de'}<v lang="de">Hilf, Maria, es ist Zeit, hilf, Mutter der Barmherzigkeit.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Help, Blessed Mother, it is highest time, help Mother of Mercy.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du bist berufen, uns aus Nöten und Gefahren zu erretten,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">You are mighty, deliver us from distress and danger,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">denn wo Menschenhilf' gebricht, mangelt doch die deine nicht.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">for where human help is lacking, yours is not.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Nein, du kannst das heisse Flehen deiner Kinder nicht verschmähen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">No, you cannot spurn the fervent supplication of your children.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Zeige, dass du Mutter bist, wo die Not am grössten ist.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Show that you are our mother where the need is greatest.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Hilf, Maria, es ist Zeit, hilf, Mutter der Barmherzigkeit.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Help, Blessed Mother, it is highest time, help Mother of Mercy.</v>{/if}
		<v lang="und">Amen.</v>
	</p>
	{/snippet}
</Prayer>

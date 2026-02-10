<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if urlLang === 'de'}<v lang="de">Jungfräulicher Vater <i><sup>⚬</sup></i>Jesu,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Virgin Father of <i><sup>⚬</sup></i>Jesus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Reinster Bräutigam <i><sup>⚬</sup></i>Mariä,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Most pure Spouse of <i><sup>⚬</sup></i>Mary,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Sankt Joseph, bitte Tag für Tag bei Jesus, dem Sohn Gottes.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Saint Joseph, pray each day to Jesus, the Son of God.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Seine Kraft und Gnade soll uns stärken,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">May His power and grace strengthen us,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dass wir siegreich streiten im Leben</v>{/if}
		{#if urlLang === 'en'}<v lang="en">that we may fight victoriously in life</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und die Krone von Ihm erhalten im Sterben.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and receive the crown from Him at death.</v>{/if}
	</p>
	{/snippet}
</Prayer>

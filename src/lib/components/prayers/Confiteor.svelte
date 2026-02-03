<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Confíteor Deo omnipoténti,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich bekenne Gott, dem Allmächtigen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I confess to almighty God,</v>{/if}
		{#if showLatin}<v lang="la">beátæ Maríæ semper Vírgini</v>{/if}
		{#if urlLang === 'de'}<v lang="de">der seligen, allzeit reinen Jungfrau Maria,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to blessed Mary ever Virgin,</v>{/if}
		{#if showLatin}<v lang="la">beáto Michaéli Archángelo,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dem hl. Erzengel Michael,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to blessed Michael the Archangel,</v>{/if}
		{#if showLatin}<v lang="la">beáto Ioánni Baptístæ,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dem hl. Johannes dem Täufer,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to blessed John the Baptist,</v>{/if}
		{#if showLatin}<v lang="la">sanctis Apóstolis Petro et Paulo,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">den hll. Aposteln Petrus und Paulus,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to the holy Apostles Peter and Paul,</v>{/if}
		{#if showLatin}<v lang="la">ómnibus Sanctis, et tibi pater:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">allen Heiligen und dir, Vater,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to all the Saints, and to you, Father,</v>{/if}
		{#if showLatin}<v lang="la">quia paccávi nimis</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dass ich viel gesündigt habe</v>{/if}
		{#if urlLang === 'en'}<v lang="en">that I have sinned exceedingly</v>{/if}
		{#if showLatin}<v lang="la">cogitatióne, verbe et ópere:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">in Gedanken, Worten und Werken,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">in thought, word, and deed:</v>{/if}
		{#if showLatin}<v lang="la">mea culpa, mea culpa, mea máxima cupla.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">durch meine Schuld, durch meine Schuld, durch meine übergrosse Schuld.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">through my fault, through my fault, through my most grievous fault.</v>{/if}
		{#if showLatin}<v lang="la">Ideo precor beátam Maríam semper Vírginem,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Darum bitte ich die selige, allzeit reine Jungfrau Maria,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Therefore I beseech the blessed Mary ever Virgin,</v>{/if}
		{#if showLatin}<v lang="la">beátum Michaélem Archángelum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">den hl. Erzengel Michael,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">blessed Michael the Archangel,</v>{/if}
		{#if showLatin}<v lang="la">beátum Ioánnem Baptístam,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dem hl. Johannes den Täufer,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">blessed John the Baptist,</v>{/if}
		{#if showLatin}<v lang="la">sanctos Apóstolos Petrum et Paulum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die hll. Apostel Petrus und Paulus,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the holy Apostles Peter and Paul,</v>{/if}
		{#if showLatin}<v lang="la">omnes Sanctos, et te pater,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">alle Heiligen und dich, Vater,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">all the Saints, and you, Father,</v>{/if}
		{#if showLatin}<v lang="la">Oráre pro me ad Dóminum Deum nostrum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">für mich zu beten bei Gott unserem Herrn.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to pray for me to the Lord our God.</v>{/if}
	</p>
	{/snippet}
</Prayer>

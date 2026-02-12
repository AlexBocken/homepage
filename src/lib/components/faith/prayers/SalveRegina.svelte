<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Salve, Regína,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Sei gegrüsst, o Königin,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Hail, Holy Queen,</v>{/if}
		{#if showLatin}<v lang="la">máter misericórdiae;</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Mutter der Barmherzigkeit,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Mother of Mercy,</v>{/if}
		{#if showLatin}<v lang="la">Víta, dulcédo et spes nóstra, sálve.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">unser Leben, unsre Wonne</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und unsere Hoffnung, sei gegrüsst!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">our life, our sweetness and our hope.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Ad te clamámus, éxsules fílii Hévae.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Zu dir rufen wir verbannte Kinder Evas;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">To thee do we cry, poor banished children of Eve.</v>{/if}
		{#if showLatin}<v lang="la">Ad te suspirámus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">zu dir seufzen wir</v>{/if}
		{#if urlLang === 'en'}<v lang="en">To thee do we send up our sighs,</v>{/if}
		{#if showLatin}<v lang="la">geméntes et fléntes in hac lacrimárum válle.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">trauernd und weinend in diesem Tal der Tränen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">mourning and weeping in this valley of tears.</v>{/if}
		{#if showLatin}<v lang="la">Eia ergo, Advocáta nóstra,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Wohlan denn, unsre Fürsprecherin,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Turn then, most gracious advocate,</v>{/if}
		{#if showLatin}<v lang="la">íllos túos misericórdes óculos ad nos convérte.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">deine barmherzigen Augen wende zu uns</v>{/if}
		{#if urlLang === 'en'}<v lang="en">thine eyes of mercy toward us.</v>{/if}
		{#if showLatin}<v lang="la">Et <i><sup>⚬</sup></i>Jésum, benedíctum frúctum véntris túi,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und nach diesem Elend zeige uns <i><sup>⚬</sup></i>Jesus,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">And after this our exile show unto us</v>{/if}
		{#if showLatin}<v lang="la">nóbis post hoc exsílíum osténde.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die gebenedeite Frucht deines Leibes.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the blessed fruit of thy womb, <i><sup>⚬</sup></i>Jesus.</v>{/if}
		{#if showLatin}<v lang="la">O clémens, o pía, o dúlcis Vírgo <i><sup>⚬</sup></i>María. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O gütige, o milde, o süsse Jungfrau <i><sup>⚬</sup></i>Maria. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O clement, O loving, O sweet Virgin <i><sup>⚬</sup></i>Mary. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

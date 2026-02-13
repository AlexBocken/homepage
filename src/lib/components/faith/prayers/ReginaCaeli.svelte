<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Regína Cæli, lætáre, allelúia.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Freu dich, du Himmelskönigin, alleluja.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Queen of Heaven, rejoice, alleluia.</v>{/if}
		{#if showLatin}<v lang="la">Quia quem meruísti portáre, allelúia.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Den du zu tragen würdig warst, alleluja.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">For He whom thou didst merit to bear, alleluia.</v>{/if}
		{#if showLatin}<v lang="la">Resurréxit, sicut dixit, allelúia.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Er ist auferstanden, wie er gesagt hat, alleluja.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Has risen, as He said, alleluia.</v>{/if}
		{#if showLatin}<v lang="la">Ora pro nobis Deum, allelúia.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Bitt Gott für uns, alleluja.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Pray for us to God, alleluia.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Gaude et lætáre, Virgo María, allelúia.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Freu dich und frohlocke, Jungfrau Maria, alleluja.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Rejoice and be glad, O Virgin Mary, alleluia.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Quia surréxit Dóminus vere, allelúia.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> Denn der Herr ist wahrhaft auferstanden, alleluja.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> For the Lord has truly risen, alleluia.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Orémus.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Lasset uns beten.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Let us pray:</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Deus, qui per resurrectiónem Fílii tui Dómini nostri Iesu Christi mundum lætificáre dignátus es,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O Gott, der du durch die Auferstehung deines Sohnes, unseres Herrn Jesus Christus, die Welt zu erfreuen dich gewürdigt hast,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O God, who through the resurrection of Thy Son our Lord Jesus Christ didst vouchsafe to give joy to the world,</v>{/if}
		{#if showLatin}<v lang="la">præsta, quǽsumus, ut per eius Genetrícem Vírginem Maríam perpétuæ capiámus gáudia vitæ.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">verleihe uns, wir bitten dich, dass wir durch seine Mutter, die Jungfrau Maria, die Freuden des ewigen Lebens erlangen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">grant, we beseech Thee, that through His Mother the Virgin Mary we may obtain the joys of everlasting life.</v>{/if}
		{#if showLatin}<v lang="la">Per eúmdem Christum Dóminum nostrum. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Durch Christus, unseren Herrn. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Through the same Christ our Lord. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

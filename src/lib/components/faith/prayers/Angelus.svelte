<script>
	import Prayer from './Prayer.svelte';
	import AveMaria from './AveMaria.svelte';

	let { verbose = false } = $props();
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Ángelus Dómini nuntiávit Maríæ.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Der Engel des Herrn brachte Maria die Botschaft</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> The Angel of the Lord declared unto Mary.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Et concépit de Spíritu Sancto.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> und sie empfing vom Heiligen Geist.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> And she conceived of the Holy Spirit.</v>{/if}
	</p>
	{/snippet}
</Prayer>

{#if verbose}
	<AveMaria />
{:else}
	<p class="ave-indicator"><i>— Ave Maria —</i></p>
{/if}

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Ecce ancílla Dómini,</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Maria sprach: Siehe, ich bin die Magd des Herrn</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Behold the handmaid of the Lord.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Fiat mihi secúndum verbum tuum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> mir geschehe nach Deinem Wort.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> Be it done unto me according to thy word.</v>{/if}
	</p>
	{/snippet}
</Prayer>

{#if verbose}
	<AveMaria />
{:else}
	<p class="ave-indicator"><i>— Ave Maria —</i></p>
{/if}

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Et Verbum caro factum est,</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Und das Wort ist Fleisch geworden</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> And the Word was made flesh.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Et habitávit in nobis.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> und hat unter uns gewohnt.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> And dwelt among us.</v>{/if}
	</p>
	{/snippet}
</Prayer>

{#if verbose}
	<AveMaria />
{:else}
	<p class="ave-indicator"><i>— Ave Maria —</i></p>
{/if}

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Ora pro nobis, sancta Dei Génetrix,</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Bitte für uns, heilige Gottesmutter,</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Pray for us, O holy Mother of God.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Ut digni efficiámur promissiónibus Christi.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> auf dass wir würdig werden der Verheissungen Christi.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> That we may be made worthy of the promises of Christ.</v>{/if}
	</p>
	{/snippet}
</Prayer>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Orémus.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Lasset uns beten.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Let us pray:</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Grátiam tuam, quǽsumus, Dómine, méntibus nostris infúnde;</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Allmächtiger Gott, giesse deine Gnade in unsere Herzen ein.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Pour forth, we beseech Thee, O Lord, Thy grace into our hearts,</v>{/if}
		{#if showLatin}<v lang="la">ut qui, Ángelo nuntiánte, Christi Fílii tui incarnatiónem cognóvimus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Durch die Botschaft des Engels haben wir die Menschwerdung Christi, deines Sohnes, erkannt.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">that we to whom the Incarnation of Christ Thy Son was made known by the message of an angel,</v>{/if}
		{#if showLatin}<v lang="la">per passiónem eius et crucem ad resurrectiónis glóriam perducámur.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Lass uns durch sein Leiden und Kreuz zur Herrlichkeit der Auferstehung gelangen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">may by His Passion and Cross be brought to the glory of His Resurrection.</v>{/if}
		{#if showLatin}<v lang="la">Per eúmdem Christum Dóminum nostrum. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Darum bitten wir durch Christus, unseren Herrn. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Through the same Christ Our Lord. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

<style>
.ave-indicator {
	text-align: center;
	color: grey;
	margin: 0.5em 0;
}
</style>

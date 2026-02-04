<script>
	import { onMount } from 'svelte';
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import LanguageToggle from "$lib/components/LanguageToggle.svelte";
	import Prayer from '$lib/components/prayers/Prayer.svelte';
	import AveMaria from '$lib/components/prayers/AveMaria.svelte';
	import "$lib/css/christ.css";
	import "$lib/css/rosenkranz.css";

	let { data } = $props();

	// Create language context for prayer components
	const langContext = createLanguageContext({ urlLang: data.lang, initialLatin: data.initialLatin });

	// Toggle href for no-JS fallback (navigates to opposite latin state)
	const latinToggleHref = $derived(data.initialLatin ? '?latin=0' : '?');

	// Update lang store when data.lang changes (e.g., after navigation)
	$effect(() => {
		langContext.lang.set(data.lang);
	});

	onMount(() => {
		// Clean up URL params after hydration (state is now in component state)
		if (window.location.search) {
			history.replaceState({}, '', window.location.pathname);
		}
	});
</script>

<svelte:head>
	<title>Angelus - The Angel of the Lord</title>
	<meta name="description" content="Pray the Angelus prayer in Latin, German, and English" />
</svelte:head>

<div class="angelus-page">
	<h1>Angelus</h1>
	<div class="toggle-controls">
	<LanguageToggle
		initialLatin={data.initialLatin}
		hasUrlLatin={data.hasUrlLatin}
		href={latinToggleHref}
	/>
	</div>

<div class="prayers-content">
	<div class="prayer-section">
<Prayer>
	{#snippet children(showLatin, urlLang)}
	<!-- First Versicle and Response -->
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Angelus Domini nuntiavit Mariæ.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Der Engel des Herrn brachte Maria die Botschaft</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> The Angel of the Lord declared unto Mary.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Et concepit de Spiritu Sancto.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> und sie empfing vom Heiligen Geist.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> And she conceived of the Holy Spirit.</v>{/if}
	</p>
	{/snippet}
</Prayer>
	</div>
	<div class="prayer-section">
	<AveMaria />
	</div>
</div>

<div class="prayer-section">
<Prayer>
	{#snippet children(showLatin, urlLang)}
	<!-- Second Versicle and Response -->
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Ecce ancilla Domini,</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Maria sprach: Siehe, ich bin die Magd des Herrn</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Behold the handmaid of the Lord.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Fiat mihi secundum verbum tuum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> mir geschehe nach Deinem Wort.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> Be it done unto me according to thy word.</v>{/if}
	</p>
	{/snippet}
</Prayer>
</div>

<div class="prayer-section">
	<AveMaria />
</div>

<div class="prayer-section">
<Prayer>
	{#snippet children(showLatin, urlLang)}
	<!-- Third Versicle and Response -->
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Et Verbum caro factum est,</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Und das Wort ist Fleisch geworden</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> And the Word was made flesh.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Et habitavit in nobis.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> und hat unter uns gewohnt.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> And dwelt among us.</v>{/if}
	</p>
	{/snippet}
</Prayer>
</div>

<div class="prayer-section">
	<AveMaria />
</div>

<div class="prayer-section">
<Prayer>
	{#snippet children(showLatin, urlLang)}
	<!-- Fourth Versicle and Response -->
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Ora pro nobis, sancta Dei Genetrix,</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Bitte für uns Heilige Gottesmutter</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Pray for us, O holy Mother of God.</v>{/if}
		{#if showLatin}<v lang="la"><i>℟.</i> Ut digni efficiamur promissionibus Christi.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℟.</i> auf dass wir würdig werden der Verheißungen Christi.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℟.</i> That we may be made worthy of the promises of Christ.</v>{/if}
	</p>
	{/snippet}
</Prayer>
</div>
<div class="prayer-section">
<Prayer>
	{#snippet children(showLatin, urlLang)}
	<!-- Closing Prayer -->
	<p>
		{#if showLatin}<v lang="la"><i>℣.</i> Oremus.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>℣.</i> Lasset uns beten.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>℣.</i> Let us pray:</v>{/if}
	</p>

	<p>
		{#if showLatin}<v lang="la">
		   Gratiam tuam, quaesumus, Domine, mentibus nostris infunde;
		</v>{/if}
		{#if urlLang === 'de'}<v lang="de">
		   Allmächtiger Gott, gieße deine Gnade in unsere Herzen ein.
		</v>{/if}
		{#if urlLang === 'en'}<v lang="en">
		   Pour forth, we beseech Thee, O Lord, Thy grace into our hearts,
		</v>{/if}
		{#if showLatin}<v lang="la">
		   ut qui, Angelo nuntiante, Christi Filii tui incarnationem cognovimus,
		</v>{/if}
		{#if urlLang === 'de'}<v lang="de">
	           Durch die Botschaft des Engels haben wir die Menschwerdung Christi, deines Sohnes, erkannt.
		</v>{/if}
		{#if urlLang === 'en'}<v lang="en">
		   that we to whom the Incarnation of Christ Thy Son was made known by the message of an angel,
		</v>{/if}
		{#if showLatin}<v lang="la">
		   per passionem eius et crucem ad resurrectionis gloriam perducamur.
		</v>{/if}
		{#if urlLang === 'de'}<v lang="de">
		   Lass uns durch sein Leiden und Kreuz zur Herrlichkeit der Auferstehung gelangen.
		</v>{/if}
		{#if urlLang === 'en'}<v lang="en">
		    may by His Passion and Cross be brought to the glory of His Resurrection.
		</v>{/if}
		{#if showLatin}<v lang="la">
		    Per eumdem Christum Dominum nostrum. Amen.
		</v>{/if}
		{#if urlLang === 'de'}<v lang="de">
		    Darum bitten wir durch Christus, unseren Herrn. Amen.
		</v>{/if}
		{#if urlLang === 'en'}<v lang="en">
	            Through the same Christ Our Lord. Amen.
		</v>{/if}
	</p>
	{/snippet}
</Prayer>
</div>


</div>
<style>
	.angelus-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	h1 {
		color: var(--nord6);
		margin: 0;
	}

	@media (prefers-color-scheme: light) {
		h1 {
			color: black;
		}
	}

.prayer-section {
	scroll-snap-align: start;
	padding: 2rem;
	margin-bottom: 2rem;
	background: var(--accent-dark);
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	position: relative;
	font-size: 1.25em;
	text-align: center;
}

@media (prefers-color-scheme: light) {
	.prayer-section {
		background: var(--nord5);
	}
}

.prayers-content {
	scroll-snap-type: y proximity;
	max-width: 700px;
}

v[lang=de] i,
v[lang=en] i{
	color: grey;
}
:global(.monolingual) v[lang=de] i,
:global(.monolingual) v[lang=en] i{
	color: var(--red);
}

h1 {
	text-align: center;
	font-size: 2.5rem;
	margin-bottom: 0.5em;
}
.toggle-controls {
	display: flex;
	justify-content: center;
	margin-bottom: 2rem;
}
</style>

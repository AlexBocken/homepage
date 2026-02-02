<script>
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import LanguageToggle from "$lib/components/LanguageToggle.svelte";
	import Prayer from '$lib/components/prayers/Prayer.svelte';
	import AveMaria from '$lib/components/prayers/AveMaria.svelte';
	import "$lib/css/christ.css";
	import "$lib/css/rosenkranz.css";

	let { data } = $props();

	// Create language context for prayer components
	const langContext = createLanguageContext({ urlLang: data.lang });

	// Update lang store when data.lang changes (e.g., after navigation)
	$effect(() => {
		langContext.lang.set(data.lang);
	});
</script>

<svelte:head>
	<title>Angelus - The Angel of the Lord</title>
	<meta name="description" content="Pray the Angelus prayer in Latin, German, and English" />
</svelte:head>

<div class="angelus-page">
	<h1>Angelus</h1>
	<div class="toggle-controls">
	<LanguageToggle />
	</div>

<div class="prayers-content">
	<div class="prayer-section">
<Prayer>
	<!-- First Versicle and Response -->
	<p>
		<v lang="la"><i>℣.</i> Angelus Domini nuntiavit Mariæ.</v>
		<v lang="de"><i>℣.</i> Der Engel des Herrn brachte Maria die Botschaft</v>
		<v lang="en"><i>℣.</i> The Angel of the Lord declared unto Mary.</v>
		<v lang="la"><i>℟.</i> Et concepit de Spiritu Sancto.</v>
		<v lang="de"><i>℟.</i> und sie empfing vom Heiligen Geist.</v>
		<v lang="en"><i>℟.</i> And she conceived of the Holy Spirit.</v>
	</p>
</Prayer>
	</div>
	<div class="prayer-section">
	<AveMaria />
	</div>
</div>

<div class="prayer-section">
<Prayer>
	<!-- Second Versicle and Response -->
	<p>
		<v lang="la"><i>℣.</i> Ecce ancilla Domini,</v>
		<v lang="de"><i>℣.</i> Maria sprach: Siehe, ich bin die Magd des Herrn</v>
		<v lang="en"><i>℣.</i> Behold the handmaid of the Lord.</v>
		<v lang="la"><i>℟.</i> Fiat mihi secundum verbum tuum.</v>
		<v lang="de"><i>℟.</i> mir geschehe nach Deinem Wort.</v>
		<v lang="en"><i>℟.</i> Be it done unto me according to thy word.</v>
	</p>
</Prayer>
</div>

<div class="prayer-section">
	<AveMaria />
</div>

<div class="prayer-section">
<Prayer>
	<!-- Third Versicle and Response -->
	<p>
		<v lang="la"><i>℣.</i> Et Verbum caro factum est,</v>
		<v lang="de"><i>℣.</i> Und das Wort ist Fleisch geworden</v>
		<v lang="en"><i>℣.</i> And the Word was made flesh.</v>
		<v lang="la"><i>℟.</i> Et habitavit in nobis.</v>
		<v lang="de"><i>℟.</i> und hat unter uns gewohnt.</v>
		<v lang="en"><i>℟.</i> And dwelt among us.</v>
	</p>
</Prayer>
</div>

<div class="prayer-section">
	<AveMaria />
</div>

<div class="prayer-section">
<Prayer>
	<!-- Fourth Versicle and Response -->
	<p>
		<v lang="la"><i>℣.</i> Ora pro nobis, sancta Dei Genetrix,</v>
		<v lang="de"><i>℣.</i> Bitte für uns Heilige Gottesmutter</v>
		<v lang="en"><i>℣.</i> Pray for us, O holy Mother of God.</v>
		<v lang="la"><i>℟.</i> Ut digni efficiamur promissionibus Christi.</v>
		<v lang="de"><i>℟.</i> auf dass wir würdig werden der Verheißungen Christi.</v>
		<v lang="en"><i>℟.</i> That we may be made worthy of the promises of Christ.</v>
	</p>
</Prayer>
</div>
<div class="prayer-section">
<Prayer>
	<!-- Closing Prayer -->
	<p>
		<v lang="la"><i>℣.</i> Oremus.</v>
		<v lang="de"><i>℣.</i> Lasset uns beten.</v>
		<v lang="en"><i>℣.</i> Let us pray:</v>
	</p>

	<p>
		<v lang="la">
		   Gratiam tuam, quaesumus, Domine, mentibus nostris infunde;
		</v>
		<v lang="de">
		   Allmächtiger Gott, gieße deine Gnade in unsere Herzen ein.
		</v>
		<v lang="en">
		   Pour forth, we beseech Thee, O Lord, Thy grace into our hearts,
		</v>
		<v lang="la">
		   ut qui, Angelo nuntiante, Christi Filii tui incarnationem cognovimus,
		</v>
		<v lang="de">
	           Durch die Botschaft des Engels haben wir die Menschwerdung Christi, deines Sohnes, erkannt.
		</v>
		<v lang="en">
		   that we to whom the Incarnation of Christ Thy Son was made known by the message of an angel,
		</v>
		<v lang="la">
		   per passionem eius et crucem ad resurrectionis gloriam perducamur.
		</v>
		<v lang="de">
		   Lass uns durch sein Leiden und Kreuz zur Herrlichkeit der Auferstehung gelangen.
		</v>
		<v lang="en">
		    may by His Passion and Cross be brought to the glory of His Resurrection.
		</v>
		<v lang="la">
		    Per eumdem Christum Dominum nostrum. Amen.
		</v>
		<v lang="de">
		    Darum bitten wir durch Christus, unseren Herrn. Amen.
		</v>
		<v lang="en">
	            Through the same Christ Our Lord. Amen.
		</v>
	</p>
</Prayer>
</div>


</div>
<style>
	.angelus-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
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

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	@media (max-width: 600px) {
		.header {
			flex-direction: column;
			align-items: flex-start;
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

<script>
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import "$lib/css/christ.css";
	import "$lib/css/nordtheme.css";
	import Gebet from "./Gebet.svelte";
	import LanguageToggle from "$lib/components/LanguageToggle.svelte";
	import Kreuzzeichen from "$lib/components/prayers/Kreuzzeichen.svelte";
	import GloriaPatri from "$lib/components/prayers/GloriaPatri.svelte";
	import Paternoster from "$lib/components/prayers/Paternoster.svelte";
	import Credo from "$lib/components/prayers/Credo.svelte";
	import AveMaria from "$lib/components/prayers/AveMaria.svelte";
	import SalveRegina from "$lib/components/prayers/SalveRegina.svelte";
	import FatimaGebet from "$lib/components/prayers/FatimaGebet.svelte";
	import Gloria from "$lib/components/prayers/Gloria.svelte";
	import MichaelGebet from "$lib/components/prayers/MichaelGebet.svelte";
	import BruderKlausGebet from "$lib/components/prayers/BruderKlausGebet.svelte";
	import JosephGebet from "$lib/components/prayers/JosephGebet.svelte";
	import Confiteor from "$lib/components/prayers/Confiteor.svelte";

	let { data } = $props();

	// Create language context for prayer components
	const langContext = createLanguageContext({ urlLang: data.lang });

	// Update lang store when data.lang changes (e.g., after navigation)
	$effect(() => {
		langContext.lang.set(data.lang);
	});

	// Reactive isEnglish based on data.lang
	const isEnglish = $derived(data.lang === 'en');

	const labels = $derived({
		title: isEnglish ? 'Prayers' : 'Gebete',
		description: isEnglish
			? 'Catholic prayers in Latin and English.'
			: 'Katholische Gebete auf Deutsch und Latein.',
		signOfCross: isEnglish ? 'The Sign of the Cross' : 'Das heilige Kreuzzeichen',
		gloriaPatri: 'Glória Patri',
		paternoster: isEnglish ? 'Our Father' : 'Paternoster',
		credo: isEnglish ? 'Nicene Creed' : 'Credo',
		aveMaria: isEnglish ? 'Hail Mary' : 'Ave Maria',
		salveRegina: 'Salve Regina',
		fatima: isEnglish ? 'Fatima Prayer' : 'Das Fatimagebet',
		gloria: 'Glória',
		gloriaIntro: isEnglish
			? 'This ancient hymn begins with the words the angels used to celebrate the newborn Savior. It first praises God the Father, then God the Son; it concludes with homage to the Most Holy Trinity, during which one makes the sign of the cross.'
			: 'Der uralte Gesang beginnt mit den Worten, mit denen die Engelscharen den neugeborenen Welterlöser feierten. Er preist zunächst Gott Vater, dann Gott Sohn; er schliesst mit einer Huldigung an die Heiligste Dreifaltigkeit, wobei man sich mit dem grossen Kreuze bezeichnet.',
		michael: isEnglish ? 'Prayer to St. Michael the Archangel' : 'Gebet zum hl. Erzengel Michael',
		bruderKlaus: isEnglish ? 'Prayer of St. Nicholas of Flüe' : 'Bruder Klaus Gebet',
		joseph: isEnglish ? 'Prayer to St. Joseph by Pope St. Pius X' : 'Josephgebet des hl. Papst Pius X',
		confiteor: isEnglish ? 'The Confiteor' : 'Das Confiteor'
	});
</script>

<svelte:head>
	<title>{labels.title} - Bocken</title>
	<meta name="description" content={labels.description} />
</svelte:head>
<style>
.ccontainer{
	margin: auto;
	overflow-x: visible;
	max-width: 1000px;
}
.container{
	column-count: 2;
	column-gap: 1em;
}
@media (max-width: 800px) {
	.container{
		column-count: 1;
		padding-left: calc((100% - 600px ) * 0.5); /* ugly*/
	}
}
:global(.container > *){
	break-inside: avoid-column; /* Prevent children from splitting across columns */
	margin-bottom: 1em;
}
h1{
	text-align: center;
	font-size: 3rem;
}
.toggle-controls {
	display: flex;
	justify-content: center;
	margin-bottom: 2rem;
}
</style>
<h1>{labels.title}</h1>

<div class="toggle-controls">
	<LanguageToggle />
</div>

<div class="ccontainer">
<div class=container>

<Gebet name={labels.signOfCross} is_bilingue={true}>
	<Kreuzzeichen />
</Gebet>

<Gebet name={labels.gloriaPatri} is_bilingue={true}>
	<GloriaPatri />
</Gebet>

<Gebet name={labels.paternoster} is_bilingue={true}>
	<Paternoster />
</Gebet>

<Gebet name={labels.credo} is_bilingue={true}>
	<Credo />
</Gebet>

<Gebet name={labels.aveMaria} is_bilingue={true}>
	<AveMaria />
</Gebet>

<Gebet name={labels.salveRegina} is_bilingue={true}>
	<SalveRegina />
</Gebet>

<Gebet name={labels.fatima} is_bilingue={true}>
	<FatimaGebet />
</Gebet>

<Gebet name={labels.gloria} is_bilingue={true}>
	<p slot="intro">{labels.gloriaIntro}</p>
	<Gloria />
</Gebet>

<Gebet name={labels.michael} is_bilingue={true}>
	<MichaelGebet />
</Gebet>

<Gebet name={labels.bruderKlaus} is_bilingue={false}>
	<BruderKlausGebet />
</Gebet>

<Gebet name={labels.joseph} is_bilingue={false}>
	<JosephGebet />
</Gebet>

<Gebet name={labels.confiteor} is_bilingue={true}>
	<Confiteor />
</Gebet>
</div>
</div>

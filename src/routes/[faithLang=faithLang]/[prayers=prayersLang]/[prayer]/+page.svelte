<script>
	import { onMount } from 'svelte';
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import LanguageToggle from "$lib/components/faith/LanguageToggle.svelte";
	import Kreuzzeichen from "$lib/components/faith/prayers/Kreuzzeichen.svelte";
	import GloriaPatri from "$lib/components/faith/prayers/GloriaPatri.svelte";
	import Paternoster from "$lib/components/faith/prayers/Paternoster.svelte";
	import Credo from "$lib/components/faith/prayers/Credo.svelte";
	import AveMaria from "$lib/components/faith/prayers/AveMaria.svelte";
	import SalveRegina from "$lib/components/faith/prayers/SalveRegina.svelte";
	import FatimaGebet from "$lib/components/faith/prayers/FatimaGebet.svelte";
	import Gloria from "$lib/components/faith/prayers/Gloria.svelte";
	import MichaelGebet from "$lib/components/faith/prayers/MichaelGebet.svelte";
	import BruderKlausGebet from "$lib/components/faith/prayers/BruderKlausGebet.svelte";
	import JosephGebet from "$lib/components/faith/prayers/JosephGebet.svelte";
	import Confiteor from "$lib/components/faith/prayers/Confiteor.svelte";
	import Postcommunio from "$lib/components/faith/prayers/Postcommunio.svelte";
	import AnimaChristi from "$lib/components/faith/prayers/AnimaChristi.svelte";
	import PrayerBeforeACrucifix from "$lib/components/faith/prayers/PrayerBeforeACrucifix.svelte";
	import GuardianAngel from "$lib/components/faith/prayers/GuardianAngel.svelte";
	import ApostlesCreed from "$lib/components/faith/prayers/ApostlesCreed.svelte";
	import TantumErgo from "$lib/components/faith/prayers/TantumErgo.svelte";
	import AngelusComponent from "$lib/components/faith/prayers/Angelus.svelte";
	import ReginaCaeli from "$lib/components/faith/prayers/ReginaCaeli.svelte";
	import StickyImage from "$lib/components/faith/StickyImage.svelte";

	let { data } = $props();

	const langContext = createLanguageContext({ urlLang: data.lang, initialLatin: data.initialLatin });

	$effect(() => {
		langContext.lang.set(data.lang);
	});

	const isEnglish = $derived(data.lang === 'en');

	// Prayer definitions with slugs
	const prayerDefs = $derived({
		'das-heilige-kreuzzeichen': { id: 'signOfCross', name: isEnglish ? 'The Sign of the Cross' : 'Das heilige Kreuzzeichen', bilingue: true },
		'the-sign-of-the-cross': { id: 'signOfCross', name: isEnglish ? 'The Sign of the Cross' : 'Das heilige Kreuzzeichen', bilingue: true },
		'gloria-patri': { id: 'gloriaPatri', name: 'Glória Patri', bilingue: true },
		'paternoster': { id: 'paternoster', name: isEnglish ? 'Our Father' : 'Paternoster', bilingue: true },
		'our-father': { id: 'paternoster', name: isEnglish ? 'Our Father' : 'Paternoster', bilingue: true },
		'credo': { id: 'credo', name: isEnglish ? 'Nicene Creed' : 'Credo', bilingue: true },
		'nicene-creed': { id: 'credo', name: isEnglish ? 'Nicene Creed' : 'Credo', bilingue: true },
		'ave-maria': { id: 'aveMaria', name: isEnglish ? 'Hail Mary' : 'Ave Maria', bilingue: true },
		'hail-mary': { id: 'aveMaria', name: isEnglish ? 'Hail Mary' : 'Ave Maria', bilingue: true },
		'salve-regina': { id: 'salveRegina', name: 'Salve Regina', bilingue: true },
		'das-fatimagebet': { id: 'fatima', name: isEnglish ? 'Fatima Prayer' : 'Das Fatimagebet', bilingue: true },
		'fatima-prayer': { id: 'fatima', name: isEnglish ? 'Fatima Prayer' : 'Das Fatimagebet', bilingue: true },
		'gloria': { id: 'gloria', name: 'Glória', bilingue: true },
		'gebet-zum-hl-erzengel-michael': { id: 'michael', name: isEnglish ? 'Prayer to St. Michael the Archangel' : 'Gebet zum hl. Erzengel Michael', bilingue: true },
		'prayer-to-st-michael-the-archangel': { id: 'michael', name: isEnglish ? 'Prayer to St. Michael the Archangel' : 'Gebet zum hl. Erzengel Michael', bilingue: true },
		'bruder-klaus-gebet': { id: 'bruderKlaus', name: isEnglish ? 'Prayer of St. Nicholas of Flüe' : 'Bruder Klaus Gebet', bilingue: false },
		'prayer-of-st-nicholas-of-flue': { id: 'bruderKlaus', name: isEnglish ? 'Prayer of St. Nicholas of Flüe' : 'Bruder Klaus Gebet', bilingue: false },
		'josephgebet-des-hl-papst-pius-x': { id: 'joseph', name: isEnglish ? 'Prayer to St. Joseph by Pope St. Pius X' : 'Josephgebet des hl. Papst Pius X', bilingue: false },
		'prayer-to-st-joseph-by-pope-st-pius-x': { id: 'joseph', name: isEnglish ? 'Prayer to St. Joseph by Pope St. Pius X' : 'Josephgebet des hl. Papst Pius X', bilingue: false },
		'das-confiteor': { id: 'confiteor', name: isEnglish ? 'The Confiteor' : 'Das Confiteor', bilingue: true },
		'the-confiteor': { id: 'confiteor', name: isEnglish ? 'The Confiteor' : 'Das Confiteor', bilingue: true },
		'postcommunio': { id: 'postcommunio', name: isEnglish ? 'Postcommunio Prayers' : 'Nachkommuniongebete', bilingue: true },
		'anima-christi': { id: 'animachristi', name: 'Ánima Christi', bilingue: true },
		'prayer-before-a-crucifix': { id: 'prayerbeforeacrucifix', name: isEnglish ? 'Prayer Before a Crucifix' : 'Gebet vor einem Kruzifix', bilingue: true },
		'gebet-vor-einem-kruzifix': { id: 'prayerbeforeacrucifix', name: isEnglish ? 'Prayer Before a Crucifix' : 'Gebet vor einem Kruzifix', bilingue: true },
		'schutzengel-gebet': { id: 'guardianAngel', name: isEnglish ? 'Guardian Angel Prayer' : 'Schutzengel-Gebet', bilingue: true },
		'guardian-angel-prayer': { id: 'guardianAngel', name: isEnglish ? 'Guardian Angel Prayer' : 'Schutzengel-Gebet', bilingue: true },
		'apostolisches-glaubensbekenntnis': { id: 'apostlesCreed', name: isEnglish ? "Apostles' Creed" : 'Apostolisches Glaubensbekenntnis', bilingue: true },
		'apostles-creed': { id: 'apostlesCreed', name: isEnglish ? "Apostles' Creed" : 'Apostolisches Glaubensbekenntnis', bilingue: true },
		'tantum-ergo': { id: 'tantumErgo', name: 'Tantum Ergo', bilingue: true },
		'angelus': { id: 'angelus', name: 'Angelus', bilingue: true },
		'regina-caeli': { id: 'reginaCaeli', name: 'Regína Cæli', bilingue: true }
	});

	const prayer = $derived(prayerDefs[data.prayer]);
	const prayerName = $derived(prayer?.name || data.prayer);
	const isBilingue = $derived(prayer?.bilingue ?? true);
	const prayerId = $derived(prayer?.id);

	const gloriaIntro = $derived(isEnglish
		? 'This ancient hymn begins with the words the angels used to celebrate the newborn Savior. It first praises God the Father, then God the Son; it concludes with homage to the Most Holy Trinity, during which one makes the sign of the cross.'
		: 'Der uralte Gesang beginnt mit den Worten, mit denen die Engelscharen den neugeborenen Welterlöser feierten. Er preist zunächst Gott Vater, dann Gott Sohn; er schliesst mit einer Huldigung an die Heiligste Dreifaltigkeit, wobei man sich mit dem grossen Kreuze bezeichnet.');

	// Toggle href for no-JS fallback (navigates to opposite latin state)
	const latinToggleHref = $derived(data.initialLatin ? '?latin=0' : '?');

	onMount(() => {
		// Clean up URL params after hydration (state is now in component state)
		if (window.location.search) {
			history.replaceState({}, '', window.location.pathname);
		}
	});
</script>

<svelte:head>
	<title>{prayerName} - Bocken</title>
</svelte:head>

<style>
.container {
	max-width: 700px;
	margin: auto;
	padding: 1em;
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
.gebet {
	text-align: center;
	font-size: 1.25em;
}
:global(.gebet v) {
	margin: 0;
	display: block;
}
:global(.gebet v:lang(la)) {
	color: var(--nord6);
}
:global(.bilingue v:lang(de)) {
	color: grey;
}
:global(.bilingue .monolingual v:lang(de)) {
	color: inherit;
}
:global(.bilingue .monolingual v:lang(de) i) {
	color: var(--nord11);
}
:global(.gebet i) {
	font-style: normal;
	color: var(--nord11);
	font-weight: 900;
}
.gebet-wrapper {
	padding: 1.5em;
	background-color: var(--accent-dark);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.intro {
	margin-bottom: 1em;
	font-style: italic;
	text-align: center;
}
@media (prefers-color-scheme: light) {
	.gebet-wrapper {
		background-color: var(--nord5);
	}
}
</style>
	{#if prayerId === 'postcommunio' || prayerId === 'prayerbeforeacrucifix'}

<h1>{prayerName}</h1>

	<div class="toggle-controls">
		<LanguageToggle
			initialLatin={data.initialLatin}
			hasUrlLatin={data.hasUrlLatin}
			href={latinToggleHref}
		/>
	</div>

	<StickyImage src="/glaube/crucifix.webp" alt="Crucifix">
		<div class="gebet-wrapper">
			<div class="gebet" class:bilingue={isBilingue}>
				{#if prayerId === 'postcommunio'}
					<Postcommunio onlyIntro={false} />
				{:else}
					<PrayerBeforeACrucifix verbose={true} />
				{/if}
			</div>
		</div>
	</StickyImage>
	{:else}
<div class="container">
	<h1>{prayerName}</h1>

	<div class="toggle-controls">
		<LanguageToggle
			initialLatin={data.initialLatin}
			hasUrlLatin={data.hasUrlLatin}
			href={latinToggleHref}
		/>
	</div>


	<div class="gebet-wrapper">
		{#if prayerId === 'gloria'}
			<p class="intro">{gloriaIntro}</p>
		{/if}
		<div class="gebet" class:bilingue={isBilingue}>
			{#if prayerId === 'signOfCross'}
				<Kreuzzeichen />
			{:else if prayerId === 'gloriaPatri'}
				<GloriaPatri />
			{:else if prayerId === 'paternoster'}
				<Paternoster />
			{:else if prayerId === 'credo'}
				<Credo />
			{:else if prayerId === 'aveMaria'}
				<AveMaria />
			{:else if prayerId === 'salveRegina'}
				<SalveRegina />
			{:else if prayerId === 'fatima'}
				<FatimaGebet />
			{:else if prayerId === 'gloria'}
				<Gloria />
			{:else if prayerId === 'michael'}
				<MichaelGebet />
			{:else if prayerId === 'bruderKlaus'}
				<BruderKlausGebet />
			{:else if prayerId === 'joseph'}
				<JosephGebet />
			{:else if prayerId === 'confiteor'}
				<Confiteor />
			{:else if prayerId === 'animachristi'}
				<AnimaChristi />
			{:else if prayerId === 'prayerbeforeacrucifix'}
				<PrayerBeforeACrucifix />
			{:else if prayerId === 'guardianAngel'}
				<GuardianAngel />
			{:else if prayerId === 'apostlesCreed'}
				<ApostlesCreed />
			{:else if prayerId === 'tantumErgo'}
				<TantumErgo />
			{:else if prayerId === 'angelus'}
				<AngelusComponent verbose={true} />
			{:else if prayerId === 'reginaCaeli'}
				<ReginaCaeli />
			{/if}
		</div>
	</div>
</div>
{/if}

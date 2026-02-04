<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import "$lib/css/christ.css";
	import "$lib/css/nordtheme.css";
	import Gebet from "./Gebet.svelte";
	import LanguageToggle from "$lib/components/LanguageToggle.svelte";
	import SearchInput from "$lib/components/SearchInput.svelte";
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
	const langContext = createLanguageContext({ urlLang: data.lang, initialLatin: data.initialLatin });

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
		confiteor: isEnglish ? 'The Confiteor' : 'Das Confiteor',
		searchPlaceholder: isEnglish ? 'Search prayers...' : 'Gebete suchen...',
		clearSearch: isEnglish ? 'Clear search' : 'Suche löschen',
		textMatch: isEnglish ? 'Match in prayer text' : 'Treffer im Gebetstext'
	});

	// JS-only search (hidden without JS)
	let jsEnabled = $state(false);
	let searchQuery = $state('');

	onMount(() => {
		jsEnabled = true;

		// Clean up URL params after hydration (state is now in component state)
		if (window.location.search) {
			history.replaceState({}, '', window.location.pathname);
		}
	});

	// Match results: 'primary' (name/terms), 'secondary' (text only), or null (no match)
	/** @type {Map<string, 'primary' | 'secondary'>} */
	let matchResults = $state(/** @type {Map<string, 'primary' | 'secondary'>} */ (new Map()));

	// Define prayers with their searchable terms and slugs for URLs
	const prayers = $derived([
		{ id: 'signOfCross', searchTerms: ['kreuzzeichen', 'sign of the cross', 'cross'], slug: isEnglish ? 'the-sign-of-the-cross' : 'das-heilige-kreuzzeichen' },
		{ id: 'gloriaPatri', searchTerms: ['gloria patri', 'glory be', 'ehre sei'], slug: 'gloria-patri' },
		{ id: 'paternoster', searchTerms: ['paternoster', 'our father', 'vater unser', 'pater noster'], slug: isEnglish ? 'our-father' : 'paternoster' },
		{ id: 'credo', searchTerms: ['credo', 'creed', 'glaubensbekenntnis', 'nicene'], slug: isEnglish ? 'nicene-creed' : 'credo' },
		{ id: 'aveMaria', searchTerms: ['ave maria', 'hail mary', 'gegrüsst seist du'], slug: isEnglish ? 'hail-mary' : 'ave-maria' },
		{ id: 'salveRegina', searchTerms: ['salve regina', 'hail holy queen'], slug: 'salve-regina' },
		{ id: 'fatima', searchTerms: ['fatima', 'fatimagebet'], slug: isEnglish ? 'fatima-prayer' : 'das-fatimagebet' },
		{ id: 'gloria', searchTerms: ['gloria', 'glory', 'gloria in excelsis'], slug: 'gloria' },
		{ id: 'michael', searchTerms: ['michael', 'archangel', 'erzengel', 'satan', 'devil', 'teufel'], slug: isEnglish ? 'prayer-to-st-michael-the-archangel' : 'gebet-zum-hl-erzengel-michael' },
		{ id: 'bruderKlaus', searchTerms: ['bruder klaus', 'nicholas', 'niklaus', 'flüe'], slug: isEnglish ? 'prayer-of-st-nicholas-of-flue' : 'bruder-klaus-gebet' },
		{ id: 'joseph', searchTerms: ['joseph', 'josef', 'pius'], slug: isEnglish ? 'prayer-to-st-joseph-by-pope-st-pius-x' : 'josephgebet-des-hl-papst-pius-x' },
		{ id: 'confiteor', searchTerms: ['confiteor', 'i confess', 'ich bekenne', 'mea culpa'], slug: isEnglish ? 'the-confiteor' : 'das-confiteor' }
	]);

	// Base URL for prayer links
	const baseUrl = $derived(isEnglish ? '/faith/prayers' : '/glaube/gebete');

	// Get prayer name by ID (reactive based on language)
	function getPrayerName(id) {
		const nameMap = {
			signOfCross: labels.signOfCross,
			gloriaPatri: labels.gloriaPatri,
			paternoster: labels.paternoster,
			credo: labels.credo,
			aveMaria: labels.aveMaria,
			salveRegina: labels.salveRegina,
			fatima: labels.fatima,
			gloria: labels.gloria,
			michael: labels.michael,
			bruderKlaus: labels.bruderKlaus,
			joseph: labels.joseph,
			confiteor: labels.confiteor
		};
		return nameMap[id] || id;
	}

	/**
	 * Normalize text for search comparison
	 * @param {string} text
	 */
	function normalize(text) {
		return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
	}

	/**
	 * Search the DOM and update match results
	 */
	function performSearch() {
		if (!browser) return;

		const query = searchQuery.trim();
		const newResults = new Map();

		if (!query) {
			// No search query - show all as primary
			prayers.forEach(p => newResults.set(p.id, 'primary'));
		} else {
			const normalizedQuery = normalize(query);

			prayers.forEach(prayer => {
				const name = getPrayerName(prayer.id);

				// Check name match
				if (normalize(name).includes(normalizedQuery)) {
					newResults.set(prayer.id, 'primary');
					return;
				}

				// Check search terms match
				if (prayer.searchTerms.some(term => normalize(term).includes(normalizedQuery))) {
					newResults.set(prayer.id, 'primary');
					return;
				}

				// Check DOM text content
				const element = document.querySelector(`[data-prayer-id="${prayer.id}"]`);
				if (element) {
					const textContent = normalize(element.textContent || '');
					if (textContent.includes(normalizedQuery)) {
						newResults.set(prayer.id, 'secondary');
					}
				}
			});
		}

		matchResults = newResults;
	}

	// Run search when query changes (debounced)
	$effect(() => {
		if (browser) {
			const query = searchQuery; // track dependency
			const timer = setTimeout(performSearch, 50);
			return () => clearTimeout(timer);
		}
	});

	// Helper to get match class for a prayer
	function getMatchClass(id) {
		if (!jsEnabled) return '';
		const match = matchResults.get(id);
		if (!searchQuery.trim()) return '';
		if (match === 'primary') return '';
		if (match === 'secondary') return 'secondary-match';
		return 'no-match';
	}

	// Sorted prayers array - primary matches first, then secondary, then hidden
	const sortedPrayers = $derived.by(() => {
		if (!searchQuery.trim()) return prayers;

		return [...prayers].sort((a, b) => {
			const matchA = matchResults.get(a.id);
			const matchB = matchResults.get(b.id);

			const orderA = matchA === 'primary' ? 0 : matchA === 'secondary' ? 1 : 2;
			const orderB = matchB === 'primary' ? 0 : matchB === 'secondary' ? 1 : 2;

			return orderA - orderB;
		});
	});

	// Prayer metadata (bilingue status)
	const prayerMeta = {
		signOfCross: { bilingue: true },
		gloriaPatri: { bilingue: true },
		paternoster: { bilingue: true },
		credo: { bilingue: true },
		aveMaria: { bilingue: true },
		salveRegina: { bilingue: true },
		fatima: { bilingue: true },
		gloria: { bilingue: true },
		michael: { bilingue: true },
		bruderKlaus: { bilingue: false },
		joseph: { bilingue: false },
		confiteor: { bilingue: true }
	};

	// Toggle href for no-JS fallback (navigates to opposite latin state)
	const latinToggleHref = $derived(data.initialLatin ? '?latin=0' : '?');
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
		padding-left: calc((100% - 600px) * 0.5);
	}
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

/* Search result styling */
.prayer-wrapper {
	position: relative;
	break-inside: avoid-column;
	margin-bottom: 1em;
}
.prayer-wrapper.no-match {
	display: none;
}
.prayer-wrapper.secondary-match {
	opacity: 0.7;
}
.prayer-wrapper.secondary-match::before {
	content: attr(data-match-label);
	position: absolute;
	top: 0.3em;
	right: 0.3em;
	font-size: 0.65em;
	padding: 0.2em 0.5em;
	background: var(--nord3);
	color: var(--nord6);
	border-radius: 4px;
	z-index: 1;
}
@media(prefers-color-scheme: light) {
	.prayer-wrapper.secondary-match::before {
		background: var(--nord4);
		color: var(--nord0);
	}
}

/* Search is hidden without JS */
.js-only {
	display: none;
}
.js-enabled .js-only {
	display: block;
}
</style>
<div class:js-enabled={jsEnabled}>
<h1>{labels.title}</h1>

<div class="toggle-controls">
	<LanguageToggle
		initialLatin={data.initialLatin}
		hasUrlLatin={data.hasUrlLatin}
		href={latinToggleHref}
	/>
</div>

<div class="js-only">
	<SearchInput
		bind:value={searchQuery}
		placeholder={labels.searchPlaceholder}
		clearTitle={labels.clearSearch}
	/>
</div>

<div class="ccontainer">
<div class=container>
{#each sortedPrayers as prayer (prayer.id)}
	<div class="prayer-wrapper {getMatchClass(prayer.id)}" data-match-label={labels.textMatch}>
	{#if prayer.id === 'gloria'}
		<Gebet name={getPrayerName(prayer.id)} is_bilingue={true} id={prayer.id} href="{baseUrl}/{prayer.slug}">
			<p slot="intro">{labels.gloriaIntro}</p>
			<Gloria />
		</Gebet>
	{:else}
		<Gebet name={getPrayerName(prayer.id)} is_bilingue={prayerMeta[prayer.id]?.bilingue ?? true} id={prayer.id} href="{baseUrl}/{prayer.slug}">
			{#if prayer.id === 'signOfCross'}
				<Kreuzzeichen />
			{:else if prayer.id === 'gloriaPatri'}
				<GloriaPatri />
			{:else if prayer.id === 'paternoster'}
				<Paternoster />
			{:else if prayer.id === 'credo'}
				<Credo />
			{:else if prayer.id === 'aveMaria'}
				<AveMaria />
			{:else if prayer.id === 'salveRegina'}
				<SalveRegina />
			{:else if prayer.id === 'fatima'}
				<FatimaGebet />
			{:else if prayer.id === 'michael'}
				<MichaelGebet />
			{:else if prayer.id === 'bruderKlaus'}
				<BruderKlausGebet />
			{:else if prayer.id === 'joseph'}
				<JosephGebet />
			{:else if prayer.id === 'confiteor'}
				<Confiteor />
			{/if}
		</Gebet>
	{/if}
	</div>
{/each}
</div>
</div>
</div>

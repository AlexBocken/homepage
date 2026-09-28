<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { m, faithSlugFromLang, prayersSlug } from '$lib/js/faithI18n';
	import { usePrayerLanguage, stripQuery } from '$lib/js/prayerLanguage.svelte';
	import Gebet from "./Gebet.svelte";
	import LanguageToggle from "$lib/components/faith/LanguageToggle.svelte";
	import SearchInput from "$lib/components/SearchInput.svelte";
	import { fuzzyScore } from '$lib/js/fuzzy';
	import { PRAYERS, PRAYER_CATEGORIES, prayerSlug } from '$lib/faith/prayers';
	import { PRAYER_COMPONENTS } from '$lib/faith/prayerComponents';
	import { isEastertide as checkEastertide } from "$lib/js/easter.svelte";

	let { data } = $props();

	// The language context the prayer components read.
	usePrayerLanguage(() => data);

	const lang = $derived(/** @type {import('$lib/js/faithI18n').FaithLang} */ (data.lang));
	const t = $derived(m[lang]);
	// Reactive isEnglish based on data.lang
	const isEnglish = $derived(lang === 'en');
	const isLatin = $derived(lang === 'la');

	const labels = $derived({
		title: t.prayers,
		description: t.prayers_description,
		searchPlaceholder: t.search_prayers,
		clearSearch: t.clear_search,
		textMatch: t.text_match
	});

	// svelte-ignore state_referenced_locally
	let selectedCategory = $state(data.initialCategory);

	// JS-only search (hidden without JS)
	let jsEnabled = $state(false);
	let searchQuery = $state('');

	/**
	 * Build href for category filter, preserving latin param state
	 * @param {string|null} categoryId
	 */
	function buildFilterHref(categoryId) {
		const params = new URLSearchParams();
		if (categoryId) params.set('category', categoryId);
		if (!data.initialLatin) params.set('latin', '0');
		const qs = params.toString();
		return qs ? `?${qs}` : '?';
	}

	onMount(() => {
		jsEnabled = true;

		// Clean up URL params after hydration (state is now in component state)
		stripQuery();
	});

	// Match results: 'primary' (name/terms), 'secondary' (text only), or null (no match)
	/** @type {Map<string, 'primary' | 'secondary'>} */
	let matchResults = $state(/** @type {Map<string, 'primary' | 'secondary'>} */ (new Map()));

	const prayers = PRAYERS;

	// Base URL for prayer links
	const baseUrl = $derived(resolve('/[faithLang=faithLang]/[prayers=prayersLang]', {
		faithLang: faithSlugFromLang(lang),
		prayers: prayersSlug(lang)
	}));

	/** The name on a prayer's card, in the page's language.
	 * @param {import('$lib/faith/prayers').PrayerDef} prayer */
	function getPrayerName(prayer) {
		return (prayer.cardName ?? prayer.name)(t);
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
				const name = getPrayerName(prayer);

				// Check name match (fuzzy)
				if (fuzzyScore(normalizedQuery, normalize(name)) > 0) {
					newResults.set(prayer.id, 'primary');
					return;
				}

				// Check search terms match (fuzzy)
				if (prayer.searchTerms.some(term => fuzzyScore(normalizedQuery, normalize(term)) > 0)) {
					newResults.set(prayer.id, 'primary');
					return;
				}

				// Check DOM text content (fuzzy)
				const element = document.querySelector(`[data-prayer-id="${prayer.id}"]`);
				if (element) {
					const textContent = normalize(element.textContent || '');
					if (fuzzyScore(normalizedQuery, textContent) > 0) {
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
	/** @param {string} id */
	function getMatchClass(id) {
		if (!jsEnabled) return '';
		const match = matchResults.get(id);
		if (!searchQuery.trim()) return '';
		if (match === 'primary') return '';
		if (match === 'secondary') return 'secondary-match';
		return 'no-match';
	}

	// Filtered by category, then sorted by search match
	const filteredPrayers = $derived.by(() => {
		let result = prayers;
		// Latin route: only show prayers that have Latin text
		if (isLatin) {
			result = result.filter(p => p.bilingue);
		}
		if (selectedCategory) {
			const cat = selectedCategory;
			result = result.filter(p => p.categories.includes(/** @type {import('$lib/faith/prayers').PrayerCategory} */ (cat)));
		}
		if (!searchQuery.trim()) return result;

		return [...result].sort((a, b) => {
			const matchA = matchResults.get(a.id);
			const matchB = matchResults.get(b.id);

			const orderA = matchA === 'primary' ? 0 : matchA === 'secondary' ? 1 : 2;
			const orderB = matchB === 'primary' ? 0 : matchB === 'secondary' ? 1 : 2;

			return orderA - orderB;
		});
	});

	const isEastertide = $derived(checkEastertide());

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

/* Category filters */
.category-filters {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 0.5em;
	margin-bottom: 1.5rem;
	padding: 0 1em;
}
.category-pill {
	padding: 0.35em 0.9em;
	border: 1.5px solid;
	border-color: light-dark(var(--nord4), var(--nord3));
	border-radius: 999px;
	color: light-dark(var(--nord3), var(--nord4));
	text-decoration: none;
	font-size: 0.9em;
	transition: border-color 0.15s, color 0.15s, background-color 0.15s;
}
.category-pill:hover {
	border-color: light-dark(var(--nord10), var(--nord8));
	color: light-dark(var(--nord10), var(--nord8));
}
.category-pill.selected {
	border-color: light-dark(var(--nord10), var(--nord8));
	background-color: light-dark(var(--nord10), var(--nord8));
	color: light-dark(var(--nord6), var(--nord0));
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
	background: light-dark(var(--nord4), var(--nord3));
	color: light-dark(var(--nord0), var(--nord6));
	border-radius: 4px;
	z-index: 1;
}

/* Postcommunio section */
.postcommunio-section {
	max-width: 600px;
	margin: 2rem auto;
	padding: 1.5em;
	background-color: light-dark(var(--nord5), #1a1a1a);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
/* Anchor for the absolute-positioned seasonal-badge below */
:global(.prayer-wrapper .gebet_wrapper) {
	position: relative;
}
/* Seasonal badge — pinned top-right of the prayer card to match the
   placement of the same badge on the rosary mystery cards */
.seasonal-badge {
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	padding: 0.25em 0.7em;
	font-size: 0.75em;
	font-weight: 700;
	border-radius: var(--radius-sm);
	background-color: var(--nord14);
	color: var(--nord0);
	z-index: 1;
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

{#if !isLatin}
<div class="toggle-controls">
	<LanguageToggle
		initialLatin={data.initialLatin}
		hasUrlLatin={data.hasUrlLatin}
		href={latinToggleHref}
	/>
</div>
{/if}

<nav class="category-filters" aria-label={t.filter_by_category}>
	<a
		href={buildFilterHref(null)}
		class="category-pill"
		class:selected={!selectedCategory}
		onclick={(e) => { e.preventDefault(); selectedCategory = null; }
  }
	>{t.all_categories}</a>
	{#each PRAYER_CATEGORIES as cat (cat.id)}
		<a
			href={buildFilterHref(cat.id)}
			class="category-pill"
			class:selected={selectedCategory === cat.id}
			onclick={(e) => { e.preventDefault(); selectedCategory = cat.id; }
  }
		>{isLatin ? cat.la : isEnglish ? cat.en : cat.de}</a>
	{/each}
</nav>

<div class="js-only">
	<SearchInput
		bind:value={searchQuery}
		placeholder={labels.searchPlaceholder}
		clearTitle={labels.clearSearch}
	/>
</div>

<div class="ccontainer">
<div class=container>
{#each filteredPrayers as prayer (prayer.id)}
	<div class="prayer-wrapper {getMatchClass(prayer.id)}" data-match-label={labels.textMatch}>
	<Gebet name={getPrayerName(prayer)} is_bilingue={prayer.bilingue} id={prayer.id} href="{baseUrl}/{prayerSlug(prayer, lang)}">
			{@const view = PRAYER_COMPONENTS[prayer.id]}
			<view.component {...view.cardProps} />
			{#if prayer.id === 'reginaCaeli' && isEastertide}
				<span class="seasonal-badge">{t.eastertide_badge}</span>
			{/if}
		</Gebet>
	</div>
{/each}
</div>

</div>
</div>

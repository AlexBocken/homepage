<script>
	import { onMount } from 'svelte';
	import { getLanguageContext } from '$lib/contexts/languageContext.js';
	import Toggle from '$lib/components/Toggle.svelte';

	export let initialLatin = undefined;
	export let hasUrlLatin = false;
	export let href = undefined;

	// Get the language context (must be created by parent page)
	const { showLatin, lang } = getLanguageContext();

	// Local state for the checkbox
	let showBilingual = initialLatin !== undefined ? initialLatin : true;

	// Flag to prevent saving before we've loaded from localStorage
	let hasLoadedFromStorage = false;

	// Sync checkbox with context
	$: $showLatin = showBilingual;

	// Save to localStorage whenever it changes (but only after initial load)
	$: if (typeof localStorage !== 'undefined' && hasLoadedFromStorage) {
		localStorage.setItem('rosary_showBilingual', showBilingual.toString());
	}

	// Dynamic label based on URL language
	$: label = $lang === 'en'
		? 'Show Latin and English'
		: 'Lateinisch und Deutsch anzeigen';

	onMount(() => {
		// Only load from localStorage if no URL param was set
		if (!hasUrlLatin) {
			const saved = localStorage.getItem('rosary_showBilingual');
			if (saved !== null) {
				showBilingual = saved === 'true';
			}
		}

		// Now allow saving
		hasLoadedFromStorage = true;
	});
</script>

<Toggle
	bind:checked={showBilingual}
	{label}
	{href}
	accentColor="var(--nord14)"
/>

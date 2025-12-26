<script>
	import { onMount } from 'svelte';
	import { getLanguageContext } from '$lib/contexts/languageContext.js';
	import Toggle from './Toggle.svelte';

	// Get the language context (must be created by parent page)
	const { showLatin } = getLanguageContext();

	// Local state for the checkbox
	let showBilingual = true;

	// Flag to prevent saving before we've loaded from localStorage
	let hasLoadedFromStorage = false;

	// Sync checkbox with context
	$: $showLatin = showBilingual;

	// Save to localStorage whenever it changes (but only after initial load)
	$: if (typeof localStorage !== 'undefined' && hasLoadedFromStorage) {
		localStorage.setItem('rosary_showBilingual', showBilingual.toString());
	}

	onMount(() => {
		// Load from localStorage
		const saved = localStorage.getItem('rosary_showBilingual');
		if (saved !== null) {
			showBilingual = saved === 'true';
		}

		// Now allow saving
		hasLoadedFromStorage = true;
	});
</script>

<Toggle
	bind:checked={showBilingual}
	label="Lateinisch und Deutsch anzeigen"
	accentColor="var(--nord14)"
/>

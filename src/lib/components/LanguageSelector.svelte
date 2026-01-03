<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { recipeTranslationStore } from '$lib/stores/recipeTranslation';
	import { languageStore } from '$lib/stores/language';
	import { onMount } from 'svelte';

	let currentPath = $state('');
	let langButton: HTMLButtonElement;
	let langOptions: HTMLDivElement;

	$effect(() => {
		// Update current language and path when page changes (reactive to browser navigation)
		const path = $page.url.pathname;
		currentPath = path;

		if (path.startsWith('/recipes')) {
			languageStore.set('en');
		} else if (path.startsWith('/rezepte')) {
			languageStore.set('de');
		} else if (path === '/') {
			// On main page, read from localStorage
			if (typeof localStorage !== 'undefined') {
				const preferredLanguage = localStorage.getItem('preferredLanguage');
				languageStore.set(preferredLanguage === 'en' ? 'en' : 'de');
			}
		}
	});

	function toggle_language_options(){
		if (langOptions) {
			langOptions.hidden = !langOptions.hidden;
		}
	}

	async function switchLanguage(lang: 'de' | 'en') {
		// Update the shared language store immediately
		languageStore.set(lang);

		// Store preference
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('preferredLanguage', lang);
		}

		// Get the current path directly from window
		const path = typeof window !== 'undefined' ? window.location.pathname : currentPath;

		// If on main page, dispatch event instead of reloading
		if (path === '/') {
			window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
			return;
		}

		// If we have recipe translation data from store, use the correct short names
		const recipeData = $recipeTranslationStore;
		if (recipeData) {
			if (lang === 'en' && recipeData.englishShortName) {
				await goto(`/recipes/${recipeData.englishShortName}`);
				return;
			} else if (lang === 'de' && recipeData.germanShortName) {
				await goto(`/rezepte/${recipeData.germanShortName}`);
				return;
			}
		}

		// Convert current path to target language (for non-recipe pages)
		let newPath = path;

		// Special handling for category and tag pages - reset to selection page
		// Icons are consistent across languages, so they can be swapped directly
		if (path.match(/\/(rezepte|recipes)\/(category|tag)\//)) {
			const pathType = path.match(/\/(category|tag)\//)?.[1];
			newPath = lang === 'en' ? `/recipes/${pathType}` : `/rezepte/${pathType}`;
		} else if (lang === 'en' && path.startsWith('/rezepte')) {
			newPath = path.replace('/rezepte', '/recipes');
		} else if (lang === 'de' && path.startsWith('/recipes')) {
			newPath = path.replace('/recipes', '/rezepte');
		} else if (!path.startsWith('/rezepte') && !path.startsWith('/recipes')) {
			// On other pages (glaube, cospend, etc), go to recipe home
			newPath = lang === 'en' ? '/recipes' : '/rezepte';
		}

		await goto(newPath);
	}

	onMount(() => {
		const handleClick = (e: MouseEvent) => {
			if(langButton && !langButton.contains(e.target as Node)){
				if (langOptions) langOptions.hidden = true;
			}
		};

		document.addEventListener("click", handleClick);

		return () => {
			document.removeEventListener("click", handleClick);
		};
	})
</script>

<style>
	.language-selector{
		position: relative;
	}
	.language-button{
		width: auto;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		background-color: var(--nord3);
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 100ms;
		border: none;
	}
	.language-button:hover{
		background-color: var(--nord2);
	}
	.language-options{
		--bg_color: var(--nord3);
		box-sizing: border-box;
		border-radius: 5px;
		position: absolute;
		right: 0;
		top: calc(100% + 10px);
		background-color: var(--bg_color);
		width: 10ch;
		padding: 0.5rem;
		z-index: 1000;
	}
	.language-options button{
		width: 100%;
		background-color: transparent;
		color: white;
		border: none;
		padding: 0.5rem;
		margin: 0;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		text-align: left;
		transition: background-color 100ms;
	}
	.language-options button:hover{
		background-color: var(--nord2);
	}
	.language-options button.active{
		background-color: var(--nord14);
	}
</style>

<div class="language-selector">
	<button bind:this={langButton} onclick={toggle_language_options} class="language-button">
		{$languageStore.toUpperCase()}
	</button>
	<div bind:this={langOptions} class="language-options" hidden>
		<button
			class:active={$languageStore === 'de'}
			onclick={() => switchLanguage('de')}
		>
			DE
		</button>
		<button
			class:active={$languageStore === 'en'}
			onclick={() => switchLanguage('en')}
		>
			EN
		</button>
	</div>
</div>

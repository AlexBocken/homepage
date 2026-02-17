<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { recipeTranslationStore } from '$lib/stores/recipeTranslation';
	import { languageStore } from '$lib/stores/language';
	import { onMount } from 'svelte';

	let { lang = undefined }: { lang?: 'de' | 'en' } = $props();

	// Use prop for display if provided (SSR-safe), otherwise fall back to store
	const displayLang = $derived(lang ?? $languageStore);

	let currentPath = $state('');
	let langButton: HTMLButtonElement;
	let isOpen = $state(false);

	// Faith subroute mappings
	const faithSubroutes: Record<string, Record<string, string>> = {
		en: { gebete: 'prayers', rosenkranz: 'rosary' },
		de: { prayers: 'gebete', rosary: 'rosenkranz' }
	};

	$effect(() => {
		// Update current language and path when page changes (reactive to browser navigation)
		const path = $page.url.pathname;
		currentPath = path;

		if (path.startsWith('/recipes') || path.startsWith('/faith')) {
			languageStore.set('en');
		} else if (path.startsWith('/rezepte') || path.startsWith('/glaube')) {
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
		isOpen = !isOpen;
	}

	function convertFaithPath(path: string, targetLang: 'de' | 'en'): string {
		const faithMatch = path.match(/^\/(glaube|faith)(\/(.+))?$/);
		if (!faithMatch) return path;

		const targetBase = targetLang === 'en' ? 'faith' : 'glaube';
		const rest = faithMatch[3]; // e.g., "gebete", "rosenkranz/sub", "angelus"

		if (!rest) {
			return `/${targetBase}`;
		}

		// Split on / to convert just the first segment (gebete→prayers, etc.)
		const parts = rest.split('/');
		parts[0] = faithSubroutes[targetLang][parts[0]] || parts[0];
		return `/${targetBase}/${parts.join('/')}`;
	}

	// Compute target paths for each language (used as href for no-JS)
	function computeTargetPath(targetLang: 'de' | 'en'): string {
		const path = currentPath || $page.url.pathname;

		if (path.startsWith('/glaube') || path.startsWith('/faith')) {
			return convertFaithPath(path, targetLang);
		}

		// Use translated recipe slugs from page data when available (works during SSR)
		const pageData = $page.data;
		if (targetLang === 'en' && path.startsWith('/rezepte')) {
			if (pageData?.englishShortName) {
				return `/recipes/${pageData.englishShortName}`;
			}
			return path.replace('/rezepte', '/recipes');
		}
		if (targetLang === 'de' && path.startsWith('/recipes')) {
			if (pageData?.germanShortName) {
				return `/rezepte/${pageData.germanShortName}`;
			}
			return path.replace('/recipes', '/rezepte');
		}

		return path;
	}

	const dePath = $derived(computeTargetPath('de'));
	const enPath = $derived(computeTargetPath('en'));

	async function switchLanguage(lang: 'de' | 'en') {
		isOpen = false;

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

		// Handle faith pages
		if (path.startsWith('/glaube') || path.startsWith('/faith')) {
			const newPath = convertFaithPath(path, lang);
			await goto(newPath);
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
			// On other pages (cospend, etc), go to recipe home
			newPath = lang === 'en' ? '/recipes' : '/rezepte';
		}

		await goto(newPath);
	}

	onMount(() => {
		const handleClick = (e: MouseEvent) => {
			if(langButton && !langButton.contains(e.target as Node)){
				isOpen = false;
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
		display: none;
	}
	.language-options::after {
		content: "";
		border: 10px solid transparent;
		border-bottom-color: var(--bg_color);
		border-top: 0;
		position: absolute;
		top: -10px;
		right: 1rem;
	}
	/* Show via JS toggle */
	.language-options.open {
		display: block;
	}
	/* Show via CSS focus-within (no-JS fallback) */
	.language-selector:focus-within .language-options {
		display: block;
	}
	.language-options a{
		display: block;
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
		text-decoration: none;
		transition: background-color 100ms;
		box-sizing: border-box;
	}
	.language-options a:hover{
		background-color: var(--nord2);
	}
	.language-options a.active{
		background-color: var(--nord8);
		color: var(--nord0);
		font-weight: 700;
	}
</style>

<div class="language-selector">
	<button bind:this={langButton} onclick={toggle_language_options} class="language-button">
		{displayLang.toUpperCase()}
	</button>
	<div class="language-options" class:open={isOpen}>
		<a
			href={dePath}
			class:active={displayLang === 'de'}
			onclick={(e) => { e.preventDefault(); switchLanguage('de'); }}
		>
			DE
		</a>
		<a
			href={enPath}
			class:active={displayLang === 'en'}
			onclick={(e) => { e.preventDefault(); switchLanguage('en'); }}
		>
			EN
		</a>
	</div>
</div>

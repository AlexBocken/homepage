<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { recipeTranslationStore } from '$lib/stores/recipeTranslation';
	import { languageStore } from '$lib/stores/language';
	import { convertFitnessPath } from '$lib/js/fitnessI18n';
	import { convertCospendPath } from '$lib/js/cospendI18n';
	import { onMount } from 'svelte';

	let { lang = undefined }: { lang?: 'de' | 'en' | 'la' } = $props();

	// Use prop for display if provided (SSR-safe), otherwise fall back to store
	const displayLang = $derived(lang ?? $languageStore);

	let currentPath = $state('');
	let langButton: HTMLButtonElement;
	let isOpen = $state(false);

	// Faith subroute mappings
	const faithSubroutes: Record<string, Record<string, string>> = {
		en: {
			gebete: 'prayers', rosenkranz: 'rosary', rosarium: 'rosary', orationes: 'prayers',
			kalender: 'calendar', calendarium: 'calendar'
		},
		de: {
			prayers: 'gebete', rosary: 'rosenkranz', rosarium: 'rosenkranz', orationes: 'gebete',
			calendar: 'kalender', calendarium: 'kalender'
		},
		la: {
			prayers: 'orationes', gebete: 'orationes', rosary: 'rosarium', rosenkranz: 'rosarium',
			calendar: 'calendarium', kalender: 'calendarium'
		}
	};

	// Whether the current page is a faith route (show LA option)
	const faithPath = $derived(currentPath || $page.url.pathname);
	const isFaithRoute = $derived(
		faithPath.startsWith('/glaube') || faithPath.startsWith('/faith') || faithPath.startsWith('/fides')
	);

	$effect(() => {
		// Update current language and path when page changes (reactive to browser navigation)
		const path = $page.url.pathname;
		currentPath = path;

		if (path.startsWith('/recipes') || path.startsWith('/faith')) {
			languageStore.set('en');
		} else if (path.startsWith('/rezepte') || path.startsWith('/glaube')) {
			languageStore.set('de');
		} else if (path.startsWith('/fides')) {
			// Latin route — no language switching needed
		} else if (path.startsWith('/fitness')) {
			// Language is determined by sub-route slugs; don't override store
		} else if (path.startsWith('/cospend')) {
			languageStore.set('de');
		} else if (path.startsWith('/expenses')) {
			languageStore.set('en');
		} else {
			// On other pages, read from localStorage
			if (typeof localStorage !== 'undefined') {
				const preferredLanguage = localStorage.getItem('preferredLanguage');
				languageStore.set(preferredLanguage === 'en' ? 'en' : 'de');
			}
		}
	});

	function toggle_language_options(){
		isOpen = !isOpen;
	}

	function convertFaithPath(path: string, targetLang: 'de' | 'en' | 'la'): string {
		const faithMatch = path.match(/^\/(glaube|faith|fides)(\/(.+))?$/);
		if (!faithMatch) return path;

		const targetBase = targetLang === 'la' ? 'fides' : targetLang === 'en' ? 'faith' : 'glaube';
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
	function computeTargetPath(targetLang: 'de' | 'en' | 'la'): string {
		const path = currentPath || $page.url.pathname;

		if (path.startsWith('/glaube') || path.startsWith('/faith') || path.startsWith('/fides')) {
			return convertFaithPath(path, targetLang);
		}

		if (path.startsWith('/fitness') && targetLang !== 'la') {
			return convertFitnessPath(path, targetLang);
		}

		if ((path.startsWith('/cospend') || path.startsWith('/expenses')) && targetLang !== 'la') {
			return convertCospendPath(path, targetLang);
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
	const laPath = $derived(computeTargetPath('la'));

	async function switchLanguage(lang: 'de' | 'en' | 'la') {
		isOpen = false;

		// Update the shared language store immediately (la not tracked in store)
		if (lang !== 'la') {
			languageStore.set(lang);
		}

		// Store preference
		if (typeof localStorage !== 'undefined' && lang !== 'la') {
			localStorage.setItem('preferredLanguage', lang);
		}

		// Get the current path directly from window
		const path = typeof window !== 'undefined' ? window.location.pathname : currentPath;

		// For pages that handle their own translations inline (not recipe/faith routes),
		// dispatch event and stay on the page
		if (!path.startsWith('/rezepte') && !path.startsWith('/recipes')
			&& !path.startsWith('/glaube') && !path.startsWith('/faith') && !path.startsWith('/fides')
			&& !path.startsWith('/fitness')
			&& !path.startsWith('/cospend') && !path.startsWith('/expenses')) {
			window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
			return;
		}

		// Handle faith pages
		if (path.startsWith('/glaube') || path.startsWith('/faith') || path.startsWith('/fides')) {
			const newPath = convertFaithPath(path, lang);
			await goto(newPath);
			return;
		}

		// Handle cospend/expenses pages
		if ((path.startsWith('/cospend') || path.startsWith('/expenses')) && lang !== 'la') {
			const newPath = convertCospendPath(path, lang);
			await goto(newPath);
			return;
		}

		// Handle fitness pages
		if (path.startsWith('/fitness') && lang !== 'la') {
			const newPath = convertFitnessPath(path, lang);
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
		padding: 0.3em 0.6em;
		border-radius: 100px;
		background: transparent;
		color: var(--nav-text, rgba(255,255,255,0.6));
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 150ms;
		border: 1px solid var(--nav-btn-border, rgba(255,255,255,0.2));
	}
	.language-button:hover{
		color: var(--nav-text-hover, white);
		border-color: var(--nav-btn-border-hover, rgba(255,255,255,0.4));
		background: var(--nav-hover-bg, rgba(255,255,255,0.1));
	}
	.options-wrap {
		--bg_color: rgba(46, 52, 64, 0.95);
		--opt-text: rgba(255,255,255,0.7);
		--opt-text-hover: white;
		--opt-hover-bg: rgba(255,255,255,0.1);
		--opt-active-bg: rgba(136, 192, 208, 0.25);
		--opt-border: rgba(255,255,255,0.08);
		position: absolute;
		right: 0;
		top: calc(100% + 2px);
		z-index: 1000;
		display: none;
	}
	.options-wrap::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0.8rem;
		border: 8px solid transparent;
		border-bottom-color: var(--bg_color);
		border-top: 0;
	}
	.language-options {
		box-sizing: border-box;
		border-radius: 8px;
		margin-top: 8px;
		background-color: var(--bg_color);
		width: 8ch;
		padding: 0.35rem;
		box-shadow: 0 4px 16px rgba(0,0,0,0.3);
	}
	/* Show via JS toggle */
	.options-wrap.open {
		display: block;
	}
	/* Show via CSS focus-within (no-JS fallback) */
	.language-selector:focus-within .options-wrap {
		display: block;
	}
	.language-options a{
		display: block;
		width: 100%;
		background-color: transparent;
		color: var(--opt-text);
		border: none;
		padding: 0.4rem 0.5rem;
		margin: 0;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		text-align: left;
		text-decoration: none;
		transition: all 100ms;
		box-sizing: border-box;
	}
	.language-options a:hover{
		background: var(--opt-hover-bg);
		color: var(--opt-text-hover);
	}
	.language-options a.active{
		background: var(--opt-active-bg);
		color: var(--opt-text-hover);
		font-weight: 700;
	}
	@media (prefers-color-scheme: dark) {
		.options-wrap {
			--bg_color: rgba(20, 20, 20, 0.92);
		}
	}
	:global(:root[data-theme="dark"]) .options-wrap {
		--bg_color: rgba(20, 20, 20, 0.92);
	}
	/* Light mode dropdown */
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .options-wrap {
			--bg_color: rgba(255, 255, 255, 0.95);
			--opt-text: rgba(0,0,0,0.6);
			--opt-text-hover: var(--nord0);
			--opt-hover-bg: rgba(0,0,0,0.06);
			--opt-active-bg: rgba(94, 129, 172, 0.15);
			--opt-border: rgba(0,0,0,0.08);
		}
	}
	:global(:root[data-theme="light"]) .options-wrap {
		--bg_color: rgba(255, 255, 255, 0.95);
		--opt-text: rgba(0,0,0,0.6);
		--opt-text-hover: var(--nord0);
		--opt-hover-bg: rgba(0,0,0,0.06);
		--opt-active-bg: rgba(94, 129, 172, 0.15);
		--opt-border: rgba(0,0,0,0.08);
	}
</style>

<div class="language-selector">
	<button bind:this={langButton} onclick={toggle_language_options} class="language-button">
		{displayLang.toUpperCase()}
	</button>
	<div class="options-wrap" class:open={isOpen}>
		<div class="language-options">
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
			{#if isFaithRoute}
				<a
					href={laPath}
					class:active={displayLang === 'la'}
					onclick={(e) => { e.preventDefault(); switchLanguage('la'); }}
				>
					LA
				</a>
			{/if}
		</div>
	</div>
</div>

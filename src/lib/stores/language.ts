import { writable } from 'svelte/store';

type Language = 'de' | 'en';

function createLanguageStore() {
	const { subscribe, set } = writable<Language>('de');

	return {
		subscribe,
		set,
		init: () => {
			if (typeof window !== 'undefined') {
				const path = window.location.pathname;
				if (path.startsWith('/recipes')) {
					set('en');
				} else if (path.startsWith('/rezepte')) {
					set('de');
				} else if (path === '/') {
					// On main page, read from localStorage
					const preferredLanguage = localStorage.getItem('preferredLanguage');
					set(preferredLanguage === 'en' ? 'en' : 'de');
				}
			}
		}
	};
}

export const languageStore = createLanguageStore();

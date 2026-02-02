import { setContext, getContext, hasContext } from 'svelte';
import { writable } from 'svelte/store';

const LANGUAGE_CONTEXT_KEY = Symbol('language');

/**
 * Creates or updates a language context for prayer components
 * @param {Object} options
 * @param {'de' | 'en'} options.urlLang - The URL language (de for /glaube, en for /faith)
 */
export function createLanguageContext({ urlLang = 'de' } = {}) {
	// Check if context already exists (e.g., during navigation)
	if (hasContext(LANGUAGE_CONTEXT_KEY)) {
		const existing = getContext(LANGUAGE_CONTEXT_KEY);
		// Update the lang store with the new URL language
		existing.lang.set(urlLang);
		return existing;
	}

	const showLatin = writable(true); // true = bilingual (Latin + vernacular), false = monolingual
	const lang = writable(urlLang); // 'de' or 'en' based on URL

	setContext(LANGUAGE_CONTEXT_KEY, {
		showLatin,
		lang
	});

	return { showLatin, lang };
}

export function getLanguageContext() {
	return getContext(LANGUAGE_CONTEXT_KEY);
}

import { setContext, getContext } from 'svelte';
import { writable } from 'svelte/store';

const LANGUAGE_CONTEXT_KEY = Symbol('language');

export function createLanguageContext() {
	const showLatin = writable(true); // true = bilingual, false = monolingual

	setContext(LANGUAGE_CONTEXT_KEY, {
		showLatin
	});

	return { showLatin };
}

export function getLanguageContext() {
	return getContext(LANGUAGE_CONTEXT_KEY);
}

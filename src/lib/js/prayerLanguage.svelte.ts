import { createLanguageContext } from '$lib/contexts/languageContext.js';

type UrlLang = 'de' | 'en' | 'la';
type PrayerPageData = { lang: string; initialLatin: boolean };

/**
 * Sets up the language context the prayer components read, from the page's
 * data, and keeps it in step when the data changes on navigation. The Latin
 * route always shows Latin — the Latin text is only rendered while
 * `showLatin` is on. Call during component initialisation.
 */
export function usePrayerLanguage(getData: () => PrayerPageData) {
	const data = getData();
	const langContext = createLanguageContext({
		urlLang: data.lang as UrlLang,
		initialLatin: data.lang === 'la' ? true : data.initialLatin
	});

	// Update lang store when data.lang changes (e.g., after navigation)
	$effect(() => {
		const { lang } = getData();
		langContext.lang.set(lang as UrlLang);
		if (lang === 'la') {
			langContext.showLatin.set(true);
		}
	});

	return langContext;
}

/**
 * Drop the query string once the page has hydrated (call from `onMount`): the
 * toggles' state now lives in the component, and the no-JS parameters would
 * only go stale.
 */
export function stripQuery() {
	if (window.location.search) {
		history.replaceState({}, '', window.location.pathname);
	}
}

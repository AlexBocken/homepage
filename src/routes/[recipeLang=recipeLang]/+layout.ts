import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';

export async function load({ params, data }) {
	// Validate recipeLang parameter
	if (params.recipeLang !== 'rezepte' && params.recipeLang !== 'recipes') {
		throw error(404, 'Not found');
	}

	const lang = params.recipeLang === 'recipes' ? 'en' : 'de';

	// Check if we're offline:
	// 1. Browser reports offline (navigator.onLine === false)
	// 2. Service worker returned offline flag (data.isOffline === true)
	const isClientOffline = browser && (!navigator.onLine || data?.isOffline);

	if (isClientOffline) {
		// Return minimal data for offline mode
		return {
			session: null,
			lang,
			recipeLang: params.recipeLang,
			isOffline: true
		};
	}

	// Use server data when available (online mode)
	return {
		...data,
		lang,
		recipeLang: params.recipeLang,
		isOffline: false
	};
}

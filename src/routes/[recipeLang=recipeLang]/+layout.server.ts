import type { LayoutServerLoad } from "./$types"
import { errorWithVerse } from "$lib/server/errorQuote"

export const load : LayoutServerLoad = async ({locals, params, fetch, url}) => {
	// Validate recipeLang parameter
	if (params.recipeLang !== 'rezepte' && params.recipeLang !== 'recipes') {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}

	const lang: 'en' | 'de' = params.recipeLang === 'recipes' ? 'en' : 'de';

	return {
		session: locals.session ?? await locals.auth(),
		lang,
		recipeLang: params.recipeLang
	}
};

import type { LayoutServerLoad } from "./$types"
import { errorWithVerse } from "$lib/server/errorQuote"
import { clientSession } from "$lib/server/session"

export const load : LayoutServerLoad = async ({locals, params, fetch, url}) => {
	// Validate faithLang parameter
	if (params.faithLang !== 'glaube' && params.faithLang !== 'faith' && params.faithLang !== 'fides') {
		await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	}

	const lang = params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de';

	return {
		session: clientSession(locals.session ?? await locals.auth()),
		lang,
		faithLang: params.faithLang
	}
};

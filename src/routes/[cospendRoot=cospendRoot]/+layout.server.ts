import type { LayoutServerLoad } from "./$types"
import { detectCospendLang } from '$lib/js/cospendI18n';

export const load : LayoutServerLoad = async ({locals, url}) => {
	return {
		session: locals.session ?? await locals.auth(),
		lang: detectCospendLang(url.pathname) as 'en' | 'de'
	}
};

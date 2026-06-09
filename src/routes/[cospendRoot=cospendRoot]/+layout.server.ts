import type { LayoutServerLoad } from "./$types"
import { detectCospendLang } from '$lib/js/cospendI18n';
import { clientSession } from "$lib/server/session"

export const load : LayoutServerLoad = async ({locals, url}) => {
	return {
		session: clientSession(locals.session ?? await locals.auth()),
		lang: detectCospendLang(url.pathname) as 'en' | 'de'
	}
};

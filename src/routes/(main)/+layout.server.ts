import type { LayoutServerLoad } from "./$types"
import { clientSession } from "$lib/server/session"
import { PREFERRED_LANG_COOKIE, isPreferredLang } from "$lib/js/preferredLang"

export const load : LayoutServerLoad = (async ({locals, cookies}) => {
	// The language the visitor picked last time, so the landing page renders
	// in it straight away (the client's localStorage only catches up after mount).
	const cookie = cookies.get(PREFERRED_LANG_COOKIE);
	return {
		session: clientSession(locals.session ?? await locals.auth()),
		preferredLang: isPreferredLang(cookie) ? cookie : 'de',
	}
});

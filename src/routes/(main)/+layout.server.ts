import type { LayoutServerLoad } from "./$types"
import { clientSession } from "$lib/server/session"

export const load : LayoutServerLoad = (async ({locals}) => {
	return {
		session: clientSession(locals.session ?? await locals.auth()),
	}
});

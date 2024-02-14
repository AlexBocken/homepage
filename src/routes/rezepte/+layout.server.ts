import type { Actions, PageServerLoad } from "./$types"
import { error } from "@sveltejs/kit"

export const load = (async ({cookies, locals}) => {
	return {
		session: await locals.getSession()
	}
});

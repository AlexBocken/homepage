import { get_username } from '$lib/js/get_username';;
import type { Actions, PageServerLoad } from "./$types"
import { error } from "@sveltejs/kit"

export const load = (async ({cookies, locals}) => {
	return {
		session: await locals.auth(),
	}
});

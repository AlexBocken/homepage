import { get_username } from '$lib/js/get_username';;
import type { Actions, PageServerLoad } from "./$types"
import { error } from "@sveltejs/kit"

export const load = (async ({cookies}) => {
	return { user: await get_username(cookies) }
});

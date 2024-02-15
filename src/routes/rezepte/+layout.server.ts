import type { PageServerLoad } from "./$types"
import { error } from "@sveltejs/kit"

export const load : PageServerLoad = async ({locals}) => {
	return {
		session: await locals.auth()
	}
};

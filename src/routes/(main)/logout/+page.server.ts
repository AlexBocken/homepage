import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ cookies }) => {
	cookies.delete("UserSession")
	redirect(303, "/")
}

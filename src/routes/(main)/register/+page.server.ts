import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
	}
}

export const actions: Actions = {
	register: async (event) => {
		const data = await event.request.formData();
 		const res = await event.fetch('/api/user/register',
	    		{method: 'POST',
			body: JSON.stringify({

				username: data.get('username'),
				password: data.get('password'),
			})
			}
			)

		throw redirect(303, "/login")
	},
}

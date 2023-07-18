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
		const acccess_options = ["rezepte", "abrechnung", "flims"]
		let enabled_access = []
		acccess_options.forEach((option) => {
			if(data.get(option) == 'on'){
					enabled_access.push(option)
			}
		})
 		const res = await event.fetch('/api/register',
	    		{method: 'POST',
			body: JSON.stringify({

				username: data.get('username'),
				password: data.get('password'),
				access: enabled_access,
			})
			}
			)

		throw redirect(303, "/login")
	},
}

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
	}
}

export const actions: Actions = {
	login: async (event) => {
		const data = await event.request.formData()
 		const res = await event.fetch('/api/login',
	    		{method: 'POST',
			body: JSON.stringify({
				username: data.get('username'),
				password: data.get('password'),
			})
			}
			)
	    const jwt = await res.json()
		event.cookies.set("UserSession", jwt, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
			maxAge: 60 * 60 * 24 * 7, // 1 week
		})

		throw redirect(303, "/")
	},
}

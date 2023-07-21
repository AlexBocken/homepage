import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { error } from "@sveltejs/kit"

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
	}
}

export const actions: Actions = {
	change_password: async (event) => {
		const data = await event.fetch.request.formData()

	},
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
		if(res.ok){
		event.cookies.set("UserSession", jwt, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
			maxAge: 60 * 60 * 24 * 7, // 1 week
		})

		throw redirect(303, "/")
		}
		else{
			throw error(401, jwt.message)
		}
	},
	logout: async () => {
		throw redirect(303, "/logout")
	},
}

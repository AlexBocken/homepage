import { authenticateUser } from "$lib/js/authenticate"
import type { Handle } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { error } from "@sveltejs/kit"

export const handle : Handle = async({event, resolve}) => {
	event.locals.user = await authenticateUser(event)
	if(event.url.pathname.startsWith('/rezepte/edit') || event.url.pathname.startsWith('/rezepte/add')){
		if(!event.locals.user){
				throw redirect(303, "/login")
		}
		else if(!event.locals.user.access.includes("rezepte")){
			throw error(401, "Your user does not have access to this page")
		}
	}
	else if(event.url.pathname.startsWith('/abrechnung')){
		console.log(event.locals.user)
		if(!event.locals.user){
				throw redirect(303, "/login")
		}
		else if(!event.locals.user.access.includes("abrechnung")){
				throw error(401, "Your User does not have access to this page")
		}
	}

	const response = await resolve(event)
	return response
}

import { authenticateUser } from "$lib/js/authenticate"
import type { Handle } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { error } from "@sveltejs/kit"
import { SvelteKitAuth } from "@auth/sveltekit"
import Authentik from "@auth/core/providers/authentik"
import { AUTHENTIK_ID, AUTHENTIK_SECRET, AUTHENTIK_ISSUER } from "$env/static/private";
import { sequence } from "@sveltejs/kit/hooks"
import * as auth from "./auth"

async function authorization({ event, resolve }) {
	// Protect any routes under /authenticated
	if (event.url.pathname.startsWith('/rezepte/edit') || event.url.pathname.startsWith('/rezepte/add')) {
   const session = await event.locals.getSession();
		if (!session) {
			throw redirect(303, '/auth/signin');
		}
	}

	// If the request is still here, just proceed as normally
	return resolve(event);
}

export const handle: Handle = sequence(
	auth.handle,
	authorization
);

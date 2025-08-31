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
   const session = await event.locals.auth();
		if (!session) {
			// Preserve the original URL the user was trying to access
			const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (! session.user.groups.includes('rezepte_users')) {
			// strip last dir from url
			// TODO: give indication of why access failed
			const new_url = event.url.pathname.split('/').slice(0, -1).join('/');
			redirect(303, new_url);
		}
	}

	// If the request is still here, just proceed as normally
	return resolve(event);
}

export const handle: Handle = sequence(
	auth.handle,
	authorization
);

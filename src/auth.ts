import { SvelteKitAuth } from "@auth/sveltekit"
import Authentik from "@auth/core/providers/authentik"
import { AUTHENTIK_ID, AUTHENTIK_SECRET, AUTHENTIK_ISSUER } from "$env/static/private";

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Authentik({
			clientId: AUTHENTIK_ID,
			clientSecret: AUTHENTIK_SECRET,
			issuer: AUTHENTIK_ISSUER,
		})],
})

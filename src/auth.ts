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
	callbacks: {
		// this feels like an extremely hacky way to get nickname and groups into the session object
		// TODO: investigate if there's a better way to do this
		jwt: async ({token, profile}) => {
			if(profile){
				token.nickname = profile.nickname;
				token.groups = profile.groups;
			}
			return token;
		},
		session: async ({session, token}) => {
			session.user.nickname = token.nickname;
			session.user.groups = token.groups;
			return session;
		},

	}
})

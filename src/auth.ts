import { SvelteKitAuth } from "@auth/sveltekit"
import Authentik from "@auth/sveltekit/providers/authentik"
import { AUTHENTIK_ID, AUTHENTIK_SECRET, AUTHENTIK_ISSUER } from "$env/static/private";
import { resolvePkByUsername } from "$lib/server/authentik";

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
				token.sub = (profile.sub as string) ?? token.sub;
			}
			// Resolve and cache the Authentik integer pk once. Settings endpoints
			// scope every write to this pk; resolving here avoids a lookup per
			// request. If Authentik is unreachable at sign-in, leave it unset —
			// requireSelf() will retry the lookup on demand.
			if (token.nickname && token.pk === undefined) {
				try {
					token.pk = await resolvePkByUsername(token.nickname as string);
				} catch (e) {
					console.error("Failed to resolve Authentik pk for", token.nickname, e);
				}
			}
			return token;
		},
		session: async ({session, token}) => {
			session.user.nickname = token.nickname as string;
			session.user.groups = token.groups as string[];
			session.user.sub = token.sub as string;
			if (typeof token.pk === "number") session.user.pk = token.pk;
			return session;
		},

	},
	trustHost: true // needed for reverse proxy setups
})

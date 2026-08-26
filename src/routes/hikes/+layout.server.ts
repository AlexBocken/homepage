import type { LayoutServerLoad } from './$types';
import { clientSession } from '$lib/server/session';
import { HUB_COOKIE, resolveHub } from '$lib/server/geoip';

export const load: LayoutServerLoad = async ({ locals, request, cookies, url }) => {
	// Departure hub for the public-transport estimates on hike pages: the
	// reader's own choice when they've made one, otherwise the nearest hub to
	// what nginx's GeoIP2 lookup says (see `$lib/server/geoip`). Resolved here
	// rather than in the browser so the estimate is in the first paint instead
	// of arriving a beat later, and so the lookup asks the reader for nothing.
	//
	// `?hub=` is how the picker works with no script running; remembering it
	// here means the choice survives the next click, exactly as it does for a
	// reader whose browser ran the script.
	const param = url.searchParams.get('hub');
	const travelHub = resolveHub(request.headers, cookies.get(HUB_COOKIE), param);
	if (param && travelHub.id === param) {
		cookies.set(HUB_COOKIE, travelHub.id, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			httpOnly: false, // the in-page picker writes the same cookie
			sameSite: 'lax'
		});
	}

	return {
		session: clientSession(locals.session ?? (await locals.auth())),
		travelHub
	};
};

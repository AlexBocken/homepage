import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LATEST_APP_VERSION } from '$lib/server/appVersion';

// GET /api/app/latest-version — latest published Android app version.
// Public + cacheable; the app polls it on the start screen to decide whether to
// prompt for an update.
export const GET: RequestHandler = () => {
	return json(
		{ version: LATEST_APP_VERSION, apk: 'https://bocken.org/static/Bocken.apk' },
		{ headers: { 'Cache-Control': 'public, max-age=3600' } }
	);
};

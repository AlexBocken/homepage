import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { PREFS_COOKIE, PREF_PARAMS, defaultPrefs, hasPrefParams, parsePrefs, prefsCookieValue, prefsFromParams } from '$lib/faith/biblePrefs';

/**
 * The reader's display preferences with no script running. The rail's links
 * and the display form send them as query parameters (see `PREF_PARAMS`);
 * they go into the same cookie the reader writes itself when the script
 * runs, and the address is cleaned by a redirect, so a preference never ends
 * up in a shared link. Every Bible page runs this, so the form works on the
 * book pages and the commentaries as it does on a chapter.
 */
export const load: LayoutServerLoad = async ({ url, cookies, parent }) => {
	if (!hasPrefParams(url.searchParams)) return {};
	const { lang } = await parent();
	// The layout knows no chapter, so the defaults assume every text exists;
	// the reader falls back from a translation the chapter lacks on its own.
	const prefs = prefsFromParams(parsePrefs(cookies.get(PREFS_COOKIE), defaultPrefs(lang, { latin: true, english: true })), url.searchParams);
	cookies.set(PREFS_COOKIE, prefsCookieValue(prefs), {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: false, // the reader writes the same cookie
		sameSite: 'lax'
	});
	const rest = new URLSearchParams(url.searchParams);
	for (const k of PREF_PARAMS) rest.delete(k);
	const q = rest.toString();
	redirect(303, `${url.pathname}${q ? `?${q}` : ''}`);
};

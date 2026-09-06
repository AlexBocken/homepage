/**
 * The visitor's chosen language for pages without a language slug (the
 * landing page, above all). It lives in localStorage for the client and in
 * a cookie for the server, so the first paint already comes out in the
 * right language instead of flashing German.
 */
export const PREFERRED_LANG_COOKIE = 'preferred_lang';
export type PreferredLang = 'de' | 'en';

export function isPreferredLang(x: unknown): x is PreferredLang {
	return x === 'de' || x === 'en';
}

/** Client: remember the choice in both places. */
export function savePreferredLang(lang: PreferredLang): void {
	try {
		localStorage.setItem('preferredLanguage', lang);
	} catch {
		// private mode; the cookie carries it
	}
	document.cookie = `${PREFERRED_LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}

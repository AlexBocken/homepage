import { browser } from '$app/environment';

/**
 * "Is this the installed app?" in its three strengths. Pick the narrowest one
 * that answers the question at hand — they are not interchangeable.
 */

/** True inside the Tauri app shell (desktop/Android). */
export function isTauri(): boolean {
	return browser && '__TAURI__' in window;
}

/**
 * True when the page runs in a standalone window: an installed PWA
 * (`display-mode: standalone`) or an iOS home-screen web app
 * (`navigator.standalone`). Says nothing about the Tauri shell.
 */
export function isStandaloneDisplay(): boolean {
	if (!browser) return false;
	if (window.matchMedia('(display-mode: standalone)').matches) return true;
	return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * The broadest check: the Tauri shell, a standalone window, or a page launched
 * from the Android home screen (`android-app://` referrer).
 */
export function isStandalone(): boolean {
	if (!browser) return false;
	if (isTauri()) return true;
	if (isStandaloneDisplay()) return true;
	return document.referrer.includes('android-app://');
}

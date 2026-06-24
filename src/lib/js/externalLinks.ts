import { browser } from '$app/environment';

/** True inside the Tauri app shell (desktop/Android). */
function isTauri(): boolean {
	return browser && '__TAURI__' in window;
}

/** True when launched as an installed PWA (standalone display mode / iOS home-screen). */
function isStandalonePWA(): boolean {
	if (!browser) return false;
	if (window.matchMedia('(display-mode: standalone)').matches) return true;
	if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
		return true;
	return false;
}

/**
 * Hand a URL to the real system browser.
 *  - Tauri: the webview has no "default browser", so bridge JS → Rust → OS via the
 *    opener plugin (xdg-open / ShellExecute / open).
 *  - PWA: the underlying browser engine already owns external navigation, so a plain
 *    `window.open(_blank)` leaves the standalone window for a browser tab.
 */
async function openExternally(url: string): Promise<void> {
	if (isTauri()) {
		try {
			const { openUrl } = await import('@tauri-apps/plugin-opener');
			await openUrl(url);
			return;
		} catch {
			// Fall through to the web path if the plugin call fails for any reason.
		}
	}
	window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open cross-origin http(s) links in the system browser instead of trapping them inside
 * the app window. Only active in an app context (Tauri or installed PWA); in a normal
 * browser tab we leave default link behaviour untouched. Returns a cleanup function.
 */
export function initExternalLinks(): () => void {
	if (!browser) return () => {};
	if (!isTauri() && !isStandalonePWA()) return () => {};

	const handler = (e: MouseEvent) => {
		// Respect the user's intent for modified / non-primary clicks.
		if (e.defaultPrevented || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

		const anchor = (e.target as Element | null)?.closest?.('a');
		if (!anchor) return;
		if (anchor.hasAttribute('download')) return;

		const href = anchor.getAttribute('href');
		if (!href) return;

		let url: URL;
		try {
			url = new URL(href, location.href);
		} catch {
			return;
		}

		// Only real web links to a different origin go to the browser; same-origin
		// links stay in-app (SvelteKit routing) and mailto:/tel:/etc. are left alone.
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
		if (url.origin === location.origin) return;

		e.preventDefault();
		void openExternally(url.href);
	};

	// Capture phase so we run before SvelteKit's client router sees the click.
	document.addEventListener('click', handler, true);
	return () => document.removeEventListener('click', handler, true);
}

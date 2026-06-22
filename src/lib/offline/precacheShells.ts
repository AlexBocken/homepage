// Shared helper to tell the service worker to pre-cache a set of page shells
// (HTML + their __data.json siblings) for offline use. Used by section layouts
// (fitness, tasks, cospend) so their pages work offline once visited online.

/**
 * Resolve the active service worker. Right after install/update the page isn't
 * controlled yet (`controller` is null), so fall back to waiting for the
 * registration to activate instead of silently skipping the precache. Race
 * against a short timeout so dev (no SW registered) never hangs.
 */
async function getActiveSW(): Promise<ServiceWorker | null> {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
	if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;
	const reg = await Promise.race([
		navigator.serviceWorker.ready,
		new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
	]);
	return reg?.active ?? null;
}

/**
 * Pre-cache page shells for offline use. `pages` are HTML shell URLs; their
 * `__data.json` siblings (needed for client-side navigation) are derived
 * automatically. No-op when no service worker is available.
 */
export async function precacheShells(pages: string[]): Promise<void> {
	const sw = await getActiveSW();
	if (!sw) return;
	const data = pages.map((p) => `${p}/__data.json`);
	sw.postMessage({ type: 'CACHE_PAGES', urls: pages });
	sw.postMessage({ type: 'CACHE_DATA', urls: data });
}

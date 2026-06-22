import { browser } from '$app/environment';

// How often to actively probe the server while in standalone mode (PWA/Tauri).
const PROBE_INTERVAL = 20_000;
// Abort a probe that hangs longer than this — a stalled request means
// "unreachable" for our purposes (captive portal, dead uplink, server down).
const PROBE_TIMEOUT = 5_000;

// Standalone = installed PWA or the Tauri Android shell. Active reachability
// probing only runs here; on the plain website we rely on navigator.onLine.
function isStandalone(): boolean {
	if (!browser) return false;
	if ('__TAURI__' in window) return true;
	if (window.matchMedia('(display-mode: standalone)').matches) return true;
	if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) return true;
	if (document.referrer.includes('android-app://')) return true;
	return false;
}

function createNetwork() {
	// navigator.onLine === false is authoritative (no link at all). === true only
	// means a local link exists, not that the server is reachable — hence probing.
	let linkUp = $state(browser ? navigator.onLine : true);
	// serverReachable is only meaningful in standalone mode; on the website it
	// stays true so `offline` collapses to just navigator.onLine.
	let serverReachable = $state(true);

	let probing = false;

	async function probe() {
		if (!browser || probing) return;
		// No local link → definitely unreachable, skip the wasted request.
		if (!navigator.onLine) {
			serverReachable = false;
			return;
		}
		probing = true;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
		try {
			const res = await fetch('/api/ping', {
				method: 'HEAD',
				cache: 'no-store',
				signal: controller.signal
			});
			serverReachable = res.ok;
		} catch {
			serverReachable = false;
		} finally {
			clearTimeout(timeout);
			probing = false;
		}
	}

	if (browser) {
		window.addEventListener('online', () => {
			linkUp = true;
			probe();
		});
		window.addEventListener('offline', () => {
			linkUp = false;
			serverReachable = false;
		});

		if (isStandalone()) {
			probe();
			setInterval(probe, PROBE_INTERVAL);
			// Re-probe on resume — intervals are throttled/suspended while the
			// app is backgrounded, so the state can be stale on return.
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') probe();
			});
		}
	}

	return {
		get online() { return linkUp && serverReachable; },
		get offline() { return !(linkUp && serverReachable); }
	};
}

export const networkStore = createNetwork();

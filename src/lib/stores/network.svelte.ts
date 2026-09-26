import { browser } from '$app/environment';
import { isStandalone } from '$lib/js/standalone';

// How often to actively probe the server while it is reachable.
const PROBE_INTERVAL = 20_000;
// While it looks unreachable, probe faster so a recovering connection is
// noticed quickly instead of waiting out the full interval.
const RETRY_INTERVAL = 3_000;
// Abort a probe that hangs longer than this — a stalled request means
// "unreachable" for our purposes (captive portal, dead uplink, server down).
const PROBE_TIMEOUT = 5_000;
// How long the connection has to stay bad before we call it offline. A phone
// launching or resuming the app often has no usable network for a few seconds
// (radio waking up, VPN reconnecting, OS not yet granting access), and that is
// not worth a badge.
const OFFLINE_GRACE = 8_000;
// Longer grace right after launch, when the above is most likely.
const STARTUP_GRACE = 15_000;

// Standalone = installed PWA or the Tauri Android shell (see isStandalone). The
// offline badge is an app-only feature: on the plain website the browser already
// tells the user when they're offline, so the store never reports offline there.

function createNetwork() {
	const standalone = isStandalone();

	// Raw signals. navigator.onLine === false means no local link; === true only
	// means a link exists, not that the server is reachable — hence probing.
	let linkUp = browser ? navigator.onLine : true;
	let serverReachable = true;

	// What the UI sees: only flips to true once the raw signals have stayed bad
	// for the whole grace period. Flips back the moment anything succeeds.
	let offline = $state(false);

	let probing = false;
	let graceTimer: ReturnType<typeof setTimeout> | undefined;
	let probeTimer: ReturnType<typeof setTimeout> | undefined;
	let graceUntil = Date.now() + STARTUP_GRACE;

	function healthy() {
		return linkUp && serverReachable;
	}

	function update() {
		if (healthy()) {
			clearTimeout(graceTimer);
			graceTimer = undefined;
			offline = false;
			return;
		}
		if (offline || graceTimer) return;
		const wait = Math.max(OFFLINE_GRACE, graceUntil - Date.now());
		graceTimer = setTimeout(() => {
			graceTimer = undefined;
			if (!healthy()) offline = true;
		}, wait);
	}

	function schedule() {
		clearTimeout(probeTimer);
		probeTimer = setTimeout(probe, healthy() ? PROBE_INTERVAL : RETRY_INTERVAL);
	}

	async function probe() {
		if (probing) return;
		linkUp = navigator.onLine;
		if (!linkUp) {
			// No local link → skip the wasted request, but keep checking: at
			// startup navigator.onLine can lag behind the real link state.
			serverReachable = false;
		} else {
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
		update();
		schedule();
	}

	if (standalone) {
		window.addEventListener('online', () => {
			linkUp = true;
			probe();
		});
		window.addEventListener('offline', () => {
			linkUp = false;
			update();
			schedule();
		});
		// Re-probe on resume — timers are throttled/suspended while the app is
		// backgrounded, so the state can be stale on return. Resuming gets the
		// same leniency as a cold start: the network may still be waking up.
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState !== 'visible') return;
			if (!offline) {
				graceUntil = Date.now() + STARTUP_GRACE;
				// A grace timer started before backgrounding would fire right
				// away on resume; restart it against the new deadline.
				clearTimeout(graceTimer);
				graceTimer = undefined;
			}
			probe();
		});
		probe();
	}

	return {
		get online() { return !offline; },
		get offline() { return offline; }
	};
}

export const networkStore = createNetwork();

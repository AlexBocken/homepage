import { browser } from '$app/environment';
import { isStandaloneDisplay } from '$lib/js/standalone';

/** How often the installed app checks whether it is back online. */
const RECONNECT_POLL_MS = 30000;

export interface SyncedStreakOptions<D> {
	/** localStorage key the streak is kept under. */
	storageKey: string;
	/** API route that answers GET and takes a POST of the whole streak. */
	endpoint: string;
	/** The streak before anything was prayed; also what a server render sees. */
	empty: () => D;
	/** The store's current streak, as it is pushed to the server. */
	snapshot: () => D;
}

/**
 * The storage and sync plumbing the rosary and Angelus streak stores share.
 *
 * The streak lives in localStorage so it works logged out and offline. Logged
 * in, every change is also POSTed to the server; a change that fails to reach
 * it is marked pending and pushed again when the browser comes back online —
 * in the installed app also by a 30 s poll, since its `online` event is not
 * reliable. What a streak is, and how local and server data merge, stays with
 * each store.
 */
export class SyncedStreak<D> {
	#opts: SyncedStreakOptions<D>;
	#isLoggedIn = $state(false);
	#syncing = $state(false);
	#pendingSync = false; // Track if we have unsynced changes
	#isOffline = $state(false);
	#reconnectInterval: ReturnType<typeof setInterval> | null = null;

	constructor(opts: SyncedStreakOptions<D>) {
		this.#opts = opts;
	}

	get isLoggedIn() {
		return this.#isLoggedIn;
	}

	set isLoggedIn(value: boolean) {
		this.#isLoggedIn = value;
	}

	get syncing() {
		return this.#syncing;
	}

	load(): D {
		if (!browser) return this.#opts.empty();

		try {
			const stored = localStorage.getItem(this.#opts.storageKey);
			if (stored) {
				return JSON.parse(stored);
			}
		} catch {
			// Invalid data, return default
		}
		return this.#opts.empty();
	}

	save(data: D): void {
		if (!browser) return;
		localStorage.setItem(this.#opts.storageKey, JSON.stringify(data));
	}

	async #saveToServer(data: D): Promise<boolean> {
		try {
			const res = await fetch(this.#opts.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			return res.ok;
		} catch {
			return false;
		}
	}

	/** Start tracking online/offline. Browser only; call once, after loading. */
	listen() {
		// Track online/offline status
		this.#isOffline = !navigator.onLine;

		window.addEventListener('online', () => {
			this.#isOffline = false;
			this.#stopReconnectPolling();
			// Sync pending changes when coming back online
			if (this.#isLoggedIn && this.#pendingSync) {
				this.push();
			}
		});

		window.addEventListener('offline', () => {
			this.#isOffline = true;
			// Only start polling in PWA mode
			if (isStandaloneDisplay() && this.#isLoggedIn && this.#pendingSync) {
				this.#startReconnectPolling();
			}
		});
	}

	#startReconnectPolling() {
		if (this.#reconnectInterval) return;
		// Poll to check if we're back online (only in PWA mode when offline)
		this.#reconnectInterval = setInterval(() => {
			if (navigator.onLine) {
				this.#isOffline = false;
				this.#stopReconnectPolling();
				if (this.#pendingSync) {
					this.push();
				}
			}
		}, RECONNECT_POLL_MS);
	}

	#stopReconnectPolling() {
		if (this.#reconnectInterval) {
			clearInterval(this.#reconnectInterval);
			this.#reconnectInterval = null;
		}
	}

	/** Push the store's current streak, unless a push is already running. */
	async push(): Promise<void> {
		if (this.#syncing || !this.#isLoggedIn) return;
		this.#syncing = true;

		try {
			const success = await this.#saveToServer(this.#opts.snapshot());
			this.#pendingSync = !success;
		} catch {
			this.#pendingSync = true;
		} finally {
			this.#syncing = false;
		}
	}

	/** Send a just-recorded streak when logged in; poll for a failed one offline in the PWA. */
	async send(data: D): Promise<void> {
		if (!this.#isLoggedIn) return;
		const success = await this.#saveToServer(data);
		this.#pendingSync = !success;

		// Start polling if offline in PWA mode
		if (!success && this.#isOffline && isStandaloneDisplay()) {
			this.#startReconnectPolling();
		}
	}
}

export function createSyncedStreak<D>(opts: SyncedStreakOptions<D>): SyncedStreak<D> {
	return new SyncedStreak(opts);
}

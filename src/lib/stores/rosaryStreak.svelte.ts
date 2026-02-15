import { browser } from '$app/environment';

const STORAGE_KEY = 'rosary_streak';

interface StreakData {
	length: number;
	lastPrayed: string | null; // ISO date string (YYYY-MM-DD)
}

function getToday(): string {
	return new Date().toISOString().split('T')[0];
}

function isYesterday(dateStr: string): boolean {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return dateStr === yesterday.toISOString().split('T')[0];
}

function loadFromStorage(): StreakData {
	if (!browser) return { length: 0, lastPrayed: null };

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch {
		// Invalid data, return default
	}
	return { length: 0, lastPrayed: null };
}

function saveToStorage(data: StreakData): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function saveToServer(data: StreakData): Promise<boolean> {
	try {
		const res = await fetch('/api/glaube/rosary-streak', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.ok;
	} catch {
		return false;
	}
}

// Merge local and server data, preferring the more recent/higher streak
function mergeStreakData(local: StreakData, server: StreakData | null): StreakData {
	if (!server) return local;

	// If same lastPrayed date, take the higher length
	if (local.lastPrayed === server.lastPrayed) {
		return local.length >= server.length ? local : server;
	}

	// Otherwise take whichever was prayed more recently
	if (!local.lastPrayed) return server;
	if (!server.lastPrayed) return local;

	return local.lastPrayed > server.lastPrayed ? local : server;
}

// Check if running as installed PWA
function isPWA(): boolean {
	if (!browser) return false;
	return window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

class RosaryStreakStore {
	#length = $state(0);
	#lastPrayed = $state<string | null>(null);
	#isLoggedIn = $state(false);
	#initialized = false;
	#syncing = $state(false);
	#pendingSync = false; // Track if we have unsynced changes
	#isOffline = $state(false);
	#reconnectInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		if (browser) {
			this.#initFromStorage();
			this.#setupNetworkListeners();
		}
	}

	#initFromStorage() {
		if (this.#initialized) return;
		const data = loadFromStorage();
		this.#length = data.length;
		this.#lastPrayed = data.lastPrayed;
		this.#initialized = true;
	}

	#setupNetworkListeners() {
		// Track online/offline status
		this.#isOffline = !navigator.onLine;

		window.addEventListener('online', () => {
			this.#isOffline = false;
			this.#stopReconnectPolling();
			// Sync pending changes when coming back online
			if (this.#isLoggedIn && this.#pendingSync) {
				this.#pushToServer();
			}
		});

		window.addEventListener('offline', () => {
			this.#isOffline = true;
			// Only start polling in PWA mode
			if (isPWA() && this.#isLoggedIn && this.#pendingSync) {
				this.#startReconnectPolling();
			}
		});
	}

	#startReconnectPolling() {
		if (this.#reconnectInterval) return;
		// Poll every 30 seconds to check if we're back online (only in PWA mode when offline)
		this.#reconnectInterval = setInterval(() => {
			if (navigator.onLine) {
				this.#isOffline = false;
				this.#stopReconnectPolling();
				if (this.#pendingSync) {
					this.#pushToServer();
				}
			}
		}, 30000);
	}

	#stopReconnectPolling() {
		if (this.#reconnectInterval) {
			clearInterval(this.#reconnectInterval);
			this.#reconnectInterval = null;
		}
	}

	get length() {
		if (this.#lastPrayed && this.#lastPrayed !== getToday() && !isYesterday(this.#lastPrayed)) {
			return 0;
		}
		return this.#length;
	}

	get lastPrayed() {
		return this.#lastPrayed;
	}

	get prayedToday(): boolean {
		return this.#lastPrayed === getToday();
	}

	get isLoggedIn() {
		return this.#isLoggedIn;
	}

	get syncing() {
		return this.#syncing;
	}

	// Initialize with server data (called on each component mount)
	initWithServerData(serverData: StreakData | null, isLoggedIn: boolean): void {
		this.#isLoggedIn = isLoggedIn;

		if (!isLoggedIn || !serverData) {
			return;
		}

		const localData = loadFromStorage();
		const merged = mergeStreakData(localData, serverData);

		// Update local state
		this.#length = merged.length;
		this.#lastPrayed = merged.lastPrayed;
		saveToStorage(merged);

		// If local had newer data, push to server
		if (merged.length !== serverData.length || merged.lastPrayed !== serverData.lastPrayed) {
			this.#pushToServer();
		}
	}

	async #pushToServer(): Promise<void> {
		if (this.#syncing || !this.#isLoggedIn) return;
		this.#syncing = true;

		try {
			const data: StreakData = { length: this.#length, lastPrayed: this.#lastPrayed };
			const success = await saveToServer(data);
			this.#pendingSync = !success;
		} catch {
			this.#pendingSync = true;
		} finally {
			this.#syncing = false;
		}
	}

	async recordPrayer(): Promise<void> {
		const today = getToday();

		// Already prayed today - no change
		if (this.#lastPrayed === today) {
			return;
		}

		// Determine new streak length
		let newLength: number;
		if (this.#lastPrayed && isYesterday(this.#lastPrayed)) {
			// Continuing streak from yesterday
			newLength = this.#length + 1;
		} else {
			// Starting new streak (either first time or gap > 1 day)
			newLength = 1;
		}

		this.#length = newLength;
		this.#lastPrayed = today;

		const data: StreakData = { length: newLength, lastPrayed: today };
		saveToStorage(data);

		// Sync to server if logged in
		if (this.#isLoggedIn) {
			const success = await saveToServer(data);
			this.#pendingSync = !success;

			// Start polling if offline in PWA mode
			if (!success && this.#isOffline && isPWA()) {
				this.#startReconnectPolling();
			}
		}
	}
}

let instance: RosaryStreakStore | null = null;

export function getRosaryStreak(): RosaryStreakStore {
	if (!instance) {
		instance = new RosaryStreakStore();
	}
	return instance;
}

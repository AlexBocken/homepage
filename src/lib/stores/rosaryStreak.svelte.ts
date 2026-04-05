import { browser } from '$app/environment';

const STORAGE_KEY = 'rosary_streak';
const STREAK_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours — covers dateline crossings

interface StreakData {
	length: number;
	lastPrayed: string | null;    // local YYYY-MM-DD (same-day dedup)
	lastPrayedTs?: number | null; // epoch ms (streak continuity across timezones)
}

function getToday(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Legacy fallback: date-string comparison for old data without timestamp
function isYesterdayByDate(dateStr: string): boolean {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const ys = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
	return dateStr === ys;
}

// Check if streak is still alive: use timestamp if available, fall back to date string
function isStreakAlive(data: StreakData): boolean {
	if (!data.lastPrayed) return false;
	if (data.lastPrayed === getToday()) return true;

	// Prefer real elapsed time (handles timezone/dateline changes)
	if (data.lastPrayedTs) {
		return (Date.now() - data.lastPrayedTs) < STREAK_WINDOW_MS;
	}

	// Legacy fallback for old data without timestamp
	return isYesterdayByDate(data.lastPrayed);
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

	// If same lastPrayed date, take the higher length, keep best timestamp
	if (local.lastPrayed === server.lastPrayed) {
		const winner = local.length >= server.length ? local : server;
		return { ...winner, lastPrayedTs: local.lastPrayedTs ?? server.lastPrayedTs ?? null };
	}

	// Otherwise take whichever was prayed more recently
	if (!local.lastPrayed) return server;
	if (!server.lastPrayed) return local;

	// Prefer timestamp comparison when available
	if (local.lastPrayedTs && server.lastPrayedTs) {
		return local.lastPrayedTs > server.lastPrayedTs ? local : server;
	}

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
	#lastPrayedTs = $state<number | null>(null);
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
		this.#lastPrayedTs = data.lastPrayedTs ?? null;
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
		if (!isStreakAlive({ length: this.#length, lastPrayed: this.#lastPrayed, lastPrayedTs: this.#lastPrayedTs })) {
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

		// If the best data we have is still expired, reset to zero so the next
		// SSR load won't flash a stale streak count.
		const effective: StreakData = isStreakAlive(merged)
			? merged
			: { length: 0, lastPrayed: null, lastPrayedTs: null };

		// Update local state
		this.#length = effective.length;
		this.#lastPrayed = effective.lastPrayed;
		this.#lastPrayedTs = effective.lastPrayedTs ?? null;
		saveToStorage(effective);

		// Push to server if anything changed (newer local data, or expired streak reset)
		if (effective.length !== serverData.length || effective.lastPrayed !== serverData.lastPrayed) {
			this.#pushToServer();
		}
	}

	async #pushToServer(): Promise<void> {
		if (this.#syncing || !this.#isLoggedIn) return;
		this.#syncing = true;

		try {
			const data: StreakData = { length: this.#length, lastPrayed: this.#lastPrayed, lastPrayedTs: this.#lastPrayedTs };
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
		const now = Date.now();
		let newLength: number;
		if (isStreakAlive({ length: this.#length, lastPrayed: this.#lastPrayed, lastPrayedTs: this.#lastPrayedTs })) {
			// Continuing streak
			newLength = this.#length + 1;
		} else {
			// Starting new streak (either first time or gap too large)
			newLength = 1;
		}

		this.#length = newLength;
		this.#lastPrayed = today;
		this.#lastPrayedTs = now;

		const data: StreakData = { length: newLength, lastPrayed: today, lastPrayedTs: now };
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

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

async function fetchFromServer(): Promise<StreakData | null> {
	try {
		const res = await fetch('/api/glaube/rosary-streak');
		if (res.ok) {
			return await res.json();
		}
	} catch {
		// Server unavailable, return null
	}
	return null;
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

class RosaryStreakStore {
	#length = $state(0);
	#lastPrayed = $state<string | null>(null);
	#isLoggedIn = $state(false);
	#initialized = false;
	#syncing = $state(false);
	#pendingSync = false; // Track if we have unsynced changes

	constructor() {
		if (browser) {
			this.#init();
			this.#setupOnlineListener();
		}
	}

	#init() {
		if (this.#initialized) return;
		const data = loadFromStorage();
		this.#length = data.length;
		this.#lastPrayed = data.lastPrayed;
		this.#initialized = true;
	}

	#setupOnlineListener() {
		window.addEventListener('online', () => {
			if (this.#isLoggedIn && this.#pendingSync) {
				this.#syncWithServer();
			}
		});
	}

	get length() {
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

	// Call this when user session is available
	async setLoggedIn(loggedIn: boolean): Promise<void> {
		this.#isLoggedIn = loggedIn;

		if (loggedIn && browser) {
			await this.#syncWithServer();
		}
	}

	async #syncWithServer(): Promise<void> {
		if (this.#syncing) return;
		this.#syncing = true;

		try {
			const serverData = await fetchFromServer();
			const localData: StreakData = { length: this.#length, lastPrayed: this.#lastPrayed };
			const merged = mergeStreakData(localData, serverData);

			// Update local state
			this.#length = merged.length;
			this.#lastPrayed = merged.lastPrayed;
			saveToStorage(merged);

			// If local had newer data, push to server
			if (!serverData || merged.length !== serverData.length || merged.lastPrayed !== serverData.lastPrayed) {
				const success = await saveToServer(merged);
				this.#pendingSync = !success;
			} else {
				this.#pendingSync = false;
			}
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

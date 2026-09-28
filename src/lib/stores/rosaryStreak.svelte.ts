import { browser } from '$app/environment';
import { localDateOffset, localDateStr } from '$lib/js/localDate';
import { createSyncedStreak } from '$lib/stores/syncedStreak.svelte';

const STORAGE_KEY = 'rosary_streak';
const STREAK_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours — covers dateline crossings

interface StreakData {
	length: number;
	lastPrayed: string | null;    // local YYYY-MM-DD (same-day dedup)
	lastPrayedTs?: number | null; // epoch ms (streak continuity across timezones)
}

// Legacy fallback: date-string comparison for old data without timestamp
function isYesterdayByDate(dateStr: string): boolean {
	return dateStr === localDateOffset(-1);
}

// Check if streak is still alive: use timestamp if available, fall back to date string
function isStreakAlive(data: StreakData): boolean {
	if (!data.lastPrayed) return false;
	if (data.lastPrayed === localDateStr()) return true;

	// Prefer real elapsed time (handles timezone/dateline changes)
	if (data.lastPrayedTs) {
		return (Date.now() - data.lastPrayedTs) < STREAK_WINDOW_MS;
	}

	// Legacy fallback for old data without timestamp
	return isYesterdayByDate(data.lastPrayed);
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

class RosaryStreakStore {
	#length = $state(0);
	#lastPrayed = $state<string | null>(null);
	#lastPrayedTs = $state<number | null>(null);
	#initialized = false;
	#sync = createSyncedStreak<StreakData>({
		storageKey: STORAGE_KEY,
		endpoint: '/api/glaube/rosary-streak',
		empty: () => ({ length: 0, lastPrayed: null }),
		snapshot: () => ({ length: this.#length, lastPrayed: this.#lastPrayed, lastPrayedTs: this.#lastPrayedTs })
	});

	constructor() {
		if (browser) {
			this.#initFromStorage();
			this.#sync.listen();
		}
	}

	#initFromStorage() {
		if (this.#initialized) return;
		const data = this.#sync.load();
		this.#length = data.length;
		this.#lastPrayed = data.lastPrayed;
		this.#lastPrayedTs = data.lastPrayedTs ?? null;
		this.#initialized = true;
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
		return this.#lastPrayed === localDateStr();
	}

	get isLoggedIn() {
		return this.#sync.isLoggedIn;
	}

	get syncing() {
		return this.#sync.syncing;
	}

	// Initialize with server data (called on each component mount)
	initWithServerData(serverData: StreakData | null, isLoggedIn: boolean): void {
		this.#sync.isLoggedIn = isLoggedIn;

		if (!isLoggedIn || !serverData) {
			return;
		}

		const localData = this.#sync.load();
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
		this.#sync.save(effective);

		// Push to server if anything changed (newer local data, or expired streak reset)
		if (effective.length !== serverData.length || effective.lastPrayed !== serverData.lastPrayed) {
			this.#sync.push();
		}
	}

	async recordPrayer(): Promise<void> {
		const today = localDateStr();

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
		this.#sync.save(data);

		// Sync to server if logged in
		await this.#sync.send(data);
	}
}

let instance: RosaryStreakStore | null = null;

export function getRosaryStreak(): RosaryStreakStore {
	if (!instance) {
		instance = new RosaryStreakStore();
	}
	return instance;
}

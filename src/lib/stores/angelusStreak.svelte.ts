import { browser } from '$app/environment';

const STORAGE_KEY = 'angelus_streak';
const STREAK_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours — covers dateline crossings

interface AngelusStreakData {
	streak: number;
	lastComplete: string | null; // local YYYY-MM-DD
	lastCompleteTs?: number | null; // epoch ms for timezone-safe streak checks
	todayPrayed: number; // bitmask: 1=morning, 2=noon, 4=evening
	todayDate: string | null; // local YYYY-MM-DD
}

export type TimeSlot = 'morning' | 'noon' | 'evening';

const TIME_BITS: Record<TimeSlot, number> = {
	morning: 1,
	noon: 2,
	evening: 4
};

function getToday(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Legacy fallback for old data without timestamp
function isYesterdayByDate(dateStr: string): boolean {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const ys = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
	return dateStr === ys;
}

function isStreakAlive(data: AngelusStreakData): boolean {
	if (!data.lastComplete) return false;
	if (data.lastComplete === getToday()) return true;

	// Prefer real elapsed time (handles timezone/dateline changes)
	if (data.lastCompleteTs) {
		return (Date.now() - data.lastCompleteTs) < STREAK_WINDOW_MS;
	}

	// Legacy fallback
	return isYesterdayByDate(data.lastComplete);
}

export function getCurrentTimeSlot(): TimeSlot {
	const hour = new Date().getHours();
	if (hour < 10) return 'morning';
	if (hour < 15) return 'noon';
	return 'evening';
}

function loadFromStorage(): AngelusStreakData {
	if (!browser) return { streak: 0, lastComplete: null, todayPrayed: 0, todayDate: null };

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch {
		// Invalid data
	}
	return { streak: 0, lastComplete: null, todayPrayed: 0, todayDate: null };
}

function saveToStorage(data: AngelusStreakData): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function saveToServer(data: AngelusStreakData): Promise<boolean> {
	try {
		const res = await fetch('/api/glaube/angelus-streak', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.ok;
	} catch {
		return false;
	}
}

function mergeStreakData(local: AngelusStreakData, server: AngelusStreakData | null): AngelusStreakData {
	if (!server) return local;

	const today = getToday();

	// Reset todayPrayed if date rolled over
	const localEffective = local.todayDate === today ? local : { ...local, todayPrayed: 0, todayDate: null };
	const serverEffective = server.todayDate === today ? server : { ...server, todayPrayed: 0, todayDate: null };

	// Merge todayPrayed bitmasks (union of both)
	const mergedTodayPrayed = localEffective.todayPrayed | serverEffective.todayPrayed;

	// Take the higher streak or more recent lastComplete
	let bestStreak: number;
	let bestLastComplete: string | null;
	let bestLastCompleteTs: number | null;

	if (localEffective.lastComplete === serverEffective.lastComplete) {
		bestStreak = Math.max(localEffective.streak, serverEffective.streak);
		bestLastComplete = localEffective.lastComplete;
		bestLastCompleteTs = localEffective.lastCompleteTs ?? serverEffective.lastCompleteTs ?? null;
	} else if (!localEffective.lastComplete) {
		bestStreak = serverEffective.streak;
		bestLastComplete = serverEffective.lastComplete;
		bestLastCompleteTs = serverEffective.lastCompleteTs ?? null;
	} else if (!serverEffective.lastComplete) {
		bestStreak = localEffective.streak;
		bestLastComplete = localEffective.lastComplete;
		bestLastCompleteTs = localEffective.lastCompleteTs ?? null;
	} else {
		// Prefer timestamp comparison when available
		if (localEffective.lastCompleteTs && serverEffective.lastCompleteTs) {
			if (localEffective.lastCompleteTs > serverEffective.lastCompleteTs) {
				bestStreak = localEffective.streak;
				bestLastComplete = localEffective.lastComplete;
				bestLastCompleteTs = localEffective.lastCompleteTs;
			} else {
				bestStreak = serverEffective.streak;
				bestLastComplete = serverEffective.lastComplete;
				bestLastCompleteTs = serverEffective.lastCompleteTs;
			}
		} else if (localEffective.lastComplete > serverEffective.lastComplete) {
			bestStreak = localEffective.streak;
			bestLastComplete = localEffective.lastComplete;
			bestLastCompleteTs = localEffective.lastCompleteTs ?? null;
		} else {
			bestStreak = serverEffective.streak;
			bestLastComplete = serverEffective.lastComplete;
			bestLastCompleteTs = serverEffective.lastCompleteTs ?? null;
		}
	}

	return {
		streak: bestStreak,
		lastComplete: bestLastComplete,
		lastCompleteTs: bestLastCompleteTs,
		todayPrayed: mergedTodayPrayed,
		todayDate: mergedTodayPrayed > 0 ? today : null
	};
}

function isPWA(): boolean {
	if (!browser) return false;
	return window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

class AngelusStreakStore {
	#streak = $state(0);
	#lastComplete = $state<string | null>(null);
	#lastCompleteTs = $state<number | null>(null);
	#todayPrayed = $state(0);
	#todayDate = $state<string | null>(null);
	#isLoggedIn = $state(false);
	#initialized = false;
	#syncing = $state(false);
	#pendingSync = false;
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
		const today = getToday();

		// Reset todayPrayed if date rolled over
		if (data.todayDate !== today) {
			data.todayPrayed = 0;
			data.todayDate = null;
		}

		this.#streak = data.streak;
		this.#lastComplete = data.lastComplete;
		this.#lastCompleteTs = data.lastCompleteTs ?? null;
		this.#todayPrayed = data.todayPrayed;
		this.#todayDate = data.todayDate;
		this.#initialized = true;
	}

	#setupNetworkListeners() {
		this.#isOffline = !navigator.onLine;

		window.addEventListener('online', () => {
			this.#isOffline = false;
			this.#stopReconnectPolling();
			if (this.#isLoggedIn && this.#pendingSync) {
				this.#pushToServer();
			}
		});

		window.addEventListener('offline', () => {
			this.#isOffline = true;
			if (isPWA() && this.#isLoggedIn && this.#pendingSync) {
				this.#startReconnectPolling();
			}
		});
	}

	#startReconnectPolling() {
		if (this.#reconnectInterval) return;
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

	get streak() {
		const data: AngelusStreakData = {
			streak: this.#streak,
			lastComplete: this.#lastComplete,
			lastCompleteTs: this.#lastCompleteTs,
			todayPrayed: this.#todayPrayed,
			todayDate: this.#todayDate
		};
		if (!isStreakAlive(data)) {
			// But if today is complete, streak might still be valid
			if (this.#todayDate !== getToday() || this.#todayPrayed !== 7) {
				return 0;
			}
		}
		return this.#streak;
	}

	get lastComplete() {
		return this.#lastComplete;
	}

	get todayPrayed() {
		if (this.#todayDate !== getToday()) return 0;
		return this.#todayPrayed;
	}

	get todayComplete(): boolean {
		return this.todayPrayed === 7;
	}

	get isLoggedIn() {
		return this.#isLoggedIn;
	}

	get syncing() {
		return this.#syncing;
	}

	isSlotPrayed(slot: TimeSlot): boolean {
		return (this.todayPrayed & TIME_BITS[slot]) !== 0;
	}

	initWithServerData(serverData: AngelusStreakData | null, isLoggedIn: boolean): void {
		this.#isLoggedIn = isLoggedIn;

		if (!isLoggedIn || !serverData) {
			return;
		}

		const localData = loadFromStorage();
		const merged = mergeStreakData(localData, serverData);

		// Check if streak is expired
		const isExpired = !isStreakAlive(merged) && merged.todayPrayed !== 7;
		const effective: AngelusStreakData = isExpired
			? { streak: 0, lastComplete: null, lastCompleteTs: null, todayPrayed: merged.todayPrayed, todayDate: merged.todayDate }
			: merged;

		this.#streak = effective.streak;
		this.#lastComplete = effective.lastComplete;
		this.#lastCompleteTs = effective.lastCompleteTs ?? null;
		this.#todayPrayed = effective.todayPrayed;
		this.#todayDate = effective.todayDate;
		saveToStorage(effective);

		if (
			effective.streak !== serverData.streak ||
			effective.lastComplete !== serverData.lastComplete ||
			effective.todayPrayed !== serverData.todayPrayed
		) {
			this.#pushToServer();
		}
	}

	async #pushToServer(): Promise<void> {
		if (this.#syncing || !this.#isLoggedIn) return;
		this.#syncing = true;

		try {
			const data: AngelusStreakData = {
				streak: this.#streak,
				lastComplete: this.#lastComplete,
				lastCompleteTs: this.#lastCompleteTs,
				todayPrayed: this.#todayPrayed,
				todayDate: this.#todayDate
			};
			const success = await saveToServer(data);
			this.#pendingSync = !success;
		} catch {
			this.#pendingSync = true;
		} finally {
			this.#syncing = false;
		}
	}

	async recordPrayer(slot: TimeSlot): Promise<boolean> {
		const today = getToday();

		// Reset if date rolled over
		if (this.#todayDate !== today) {
			this.#todayPrayed = 0;
			this.#todayDate = today;
		}

		const bit = TIME_BITS[slot];

		// Already prayed this slot
		if ((this.#todayPrayed & bit) !== 0) {
			return false;
		}

		this.#todayPrayed |= bit;
		this.#todayDate = today;

		// Check if day is now complete
		let dayCompleted = false;
		if (this.#todayPrayed === 7) {
			dayCompleted = true;
			const now = Date.now();

			// Update streak
			const alive = isStreakAlive({
				streak: this.#streak,
				lastComplete: this.#lastComplete,
				lastCompleteTs: this.#lastCompleteTs,
				todayPrayed: 0, todayDate: null
			});
			if (alive && this.#lastComplete !== today) {
				this.#streak += 1;
			} else if (!alive) {
				this.#streak = 1;
			}
			this.#lastComplete = today;
			this.#lastCompleteTs = now;
		}

		const data: AngelusStreakData = {
			streak: this.#streak,
			lastComplete: this.#lastComplete,
			lastCompleteTs: this.#lastCompleteTs,
			todayPrayed: this.#todayPrayed,
			todayDate: this.#todayDate
		};
		saveToStorage(data);

		if (this.#isLoggedIn) {
			const success = await saveToServer(data);
			this.#pendingSync = !success;

			if (!success && this.#isOffline && isPWA()) {
				this.#startReconnectPolling();
			}
		}

		return dayCompleted;
	}
}

let instance: AngelusStreakStore | null = null;

export function getAngelusStreak(): AngelusStreakStore {
	if (!instance) {
		instance = new AngelusStreakStore();
	}
	return instance;
}

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

class RosaryStreakStore {
	#length = $state(0);
	#lastPrayed = $state<string | null>(null);
	#initialized = false;

	constructor() {
		if (browser) {
			this.#init();
		}
	}

	#init() {
		if (this.#initialized) return;
		const data = loadFromStorage();
		this.#length = data.length;
		this.#lastPrayed = data.lastPrayed;
		this.#initialized = true;
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

	recordPrayer(): void {
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
		saveToStorage({ length: newLength, lastPrayed: today });
	}
}

let instance: RosaryStreakStore | null = null;

export function getRosaryStreak(): RosaryStreakStore {
	if (!instance) {
		instance = new RosaryStreakStore();
	}
	return instance;
}

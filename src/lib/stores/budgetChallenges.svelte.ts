import { browser } from '$app/environment';

// Playful, user-set spending challenges (e.g. "Kaffee unter 40"). Kept in
// localStorage — they're a game layer, not accounting data, so they stay out of
// the read-only ledger.
export interface Challenge {
	account: string;
	label: string;
	target: number;
}

const KEY = 'finance:challenges';

function load(): Challenge[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as Challenge[]) : [];
	} catch {
		return [];
	}
}

class ChallengeStore {
	items = $state<Challenge[]>(load());

	add(c: Challenge) {
		this.items.push(c);
		this.persist();
	}

	remove(index: number) {
		this.items.splice(index, 1);
		this.persist();
	}

	private persist() {
		if (browser) localStorage.setItem(KEY, JSON.stringify(this.items));
	}
}

export const challenges = new ChallengeStore();

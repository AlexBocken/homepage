import { describe, it, expect } from 'vitest';
import {
	rememberFilters, recallFilters, forgetFilters, snapshotIsFresh,
	IDLE_TTL_MS, MAX_AGE_MS, type StorageLike,
} from '../../../src/lib/js/filterMemory';

/** A storage that behaves like sessionStorage, without needing a browser. */
function fakeStorage(): StorageLike & { map: Map<string, string> } {
	const map = new Map<string, string>();
	return {
		map,
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => void map.set(k, v),
		removeItem: (k) => void map.delete(k),
	};
}

/** A storage that throws on every access, like a locked-down private window. */
const hostileStorage: StorageLike = {
	getItem() { throw new Error('blocked'); },
	setItem() { throw new Error('blocked'); },
	removeItem() { throw new Error('blocked'); },
};

const KEY = 'recipes:listing:de';
const T0 = 1_700_000_000_000;

describe('filter memory', () => {
	it('gives back what was stored', () => {
		const s = fakeStorage();
		rememberFilters(KEY, 'q=suppe&fav=1', T0, s);
		expect(recallFilters(KEY, T0 + 1000, s)).toBe('q=suppe&fav=1');
	});

	it('forgets a filter set nobody has touched for half an hour', () => {
		const s = fakeStorage();
		rememberFilters(KEY, 'q=suppe', T0, s);
		expect(recallFilters(KEY, T0 + IDLE_TTL_MS - 1, s)).toBe('q=suppe');
		expect(recallFilters(KEY, T0 + IDLE_TTL_MS + 1, s)).toBeNull();
	});

	// The idle clock alone never expires: every restore is a write, which resets it.
	// Without a second clock a tab left open overnight reopens yesterday's filters.
	it('forgets a filter set that has been alive too long, however often it is touched', () => {
		const s = fakeStorage();
		rememberFilters(KEY, 'q=suppe', T0, s);
		let now = T0;
		for (let i = 0; i < 20; i++) {
			now += IDLE_TTL_MS - 1000;
			rememberFilters(KEY, 'q=suppe', now, s);
		}
		expect(now - T0).toBeGreaterThan(MAX_AGE_MS);
		expect(recallFilters(KEY, now, s)).toBeNull();
	});

	it('starts a new run once the old one has aged out', () => {
		const s = fakeStorage();
		rememberFilters(KEY, 'q=suppe', T0, s);
		const later = T0 + MAX_AGE_MS + 1;
		rememberFilters(KEY, 'q=brot', later, s);
		expect(recallFilters(KEY, later + 1000, s)).toBe('q=brot');
	});

	// Clearing the rail by hand is a decision, not an absence — nobody expects the
	// old filters to come back ten minutes later.
	it('treats an empty filter set as clearing the memory', () => {
		const s = fakeStorage();
		rememberFilters(KEY, 'q=suppe', T0, s);
		rememberFilters(KEY, '', T0 + 1000, s);
		expect(recallFilters(KEY, T0 + 2000, s)).toBeNull();
	});

	it('drops a snapshot stamped in the future, where both ages are meaningless', () => {
		const s = fakeStorage();
		rememberFilters(KEY, 'q=suppe', T0 + 60_000, s);
		expect(recallFilters(KEY, T0, s)).toBeNull();
	});

	it('forgets on request', () => {
		const s = fakeStorage();
		rememberFilters(KEY, 'q=suppe', T0, s);
		forgetFilters(KEY, s);
		expect(recallFilters(KEY, T0 + 1, s)).toBeNull();
	});

	it('keeps one set per key, so the two languages do not cross', () => {
		const s = fakeStorage();
		rememberFilters('recipes:listing:de', 'category=Suppe', T0, s);
		rememberFilters('recipes:listing:en', 'category=Soup', T0, s);
		expect(recallFilters('recipes:listing:de', T0 + 1, s)).toBe('category=Suppe');
		expect(recallFilters('recipes:listing:en', T0 + 1, s)).toBe('category=Soup');
	});

	it('survives storage that is unavailable or throws', () => {
		expect(() => rememberFilters(KEY, 'q=suppe', T0, hostileStorage)).not.toThrow();
		expect(recallFilters(KEY, T0, hostileStorage)).toBeNull();
		expect(() => forgetFilters(KEY, hostileStorage)).not.toThrow();
		expect(recallFilters(KEY, T0, null)).toBeNull();
	});

	it('ignores a stored value that is not a snapshot', () => {
		const s = fakeStorage();
		s.map.set(KEY, 'not json');
		expect(recallFilters(KEY, T0, s)).toBeNull();
		s.map.set(KEY, JSON.stringify({ nothing: true }));
		expect(recallFilters(KEY, T0, s)).toBeNull();
	});

	// Snapshots written before the absolute cap existed carry no firstTs.
	it('reads a snapshot with no start time as having started when it was written', () => {
		const s = fakeStorage();
		s.map.set(KEY, JSON.stringify({ search: 'q=suppe', ts: T0 }));
		expect(recallFilters(KEY, T0 + 1000, s)).toBe('q=suppe');
	});

	it('states the policy on its own', () => {
		expect(snapshotIsFresh({ search: 'q=x', ts: T0, firstTs: T0 }, T0)).toBe(true);
		expect(snapshotIsFresh({ search: '', ts: T0, firstTs: T0 }, T0)).toBe(false);
	});
});

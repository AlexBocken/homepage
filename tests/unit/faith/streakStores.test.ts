import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Pins the behaviour of the rosary and Angelus streak stores: what they read
// from and write to localStorage and the server, how they merge the two, how a
// day rolls over and when the streak grows or restarts, and when an unsynced
// change is pushed again (coming back online, or the 30 s poll in the PWA).

let standalone = false;
vi.mock('$lib/js/standalone', () => ({ isStandaloneDisplay: () => standalone }));

let online = true;
Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });

const fetchMock = vi.fn();

/** An in-memory localStorage (the runtime's own may be missing under Vitest). */
const memory = new Map<string, string>();
const localStorage = {
	getItem: (k: string) => memory.get(k) ?? null,
	setItem: (k: string, v: string) => void memory.set(k, String(v)),
	removeItem: (k: string) => void memory.delete(k),
	clear: () => memory.clear()
};
vi.stubGlobal('localStorage', localStorage);

/** A fresh module, so each test gets its own singleton store. */
async function rosary() {
	vi.resetModules();
	return (await import('$lib/stores/rosaryStreak.svelte')).getRosaryStreak();
}
async function angelusModule() {
	vi.resetModules();
	return await import('$lib/stores/angelusStreak.svelte');
}

const ok = () => Promise.resolve({ ok: true } as Response);
const notOk = () => Promise.resolve({ ok: false } as Response);
/** Let the store's awaited fetches settle. */
const flush = async () => {
	for (let i = 0; i < 5; i++) await Promise.resolve();
};
const posts = () =>
	fetchMock.mock.calls.map(([url, init]) => ({ url, method: init?.method, body: JSON.parse(init?.body ?? 'null') }));
const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');

// Every store instance adds online/offline listeners to window; drop them after
// each test so an earlier test's store never reacts to a later test's events.
const added: [string, EventListenerOrEventListenerObject][] = [];
const addEventListener = window.addEventListener.bind(window);
window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
	added.push([type, listener]);
	addEventListener(type, listener, opts);
}) as typeof window.addEventListener;

const DAY = 24 * 60 * 60 * 1000;
// Noon local time, so ±hours never cross a day by accident.
const T0 = new Date(2026, 8, 10, 12, 0, 0).getTime();

// Transform both stores once up front, with real timers: under a busy full run
// the first import can outlast a test's timeout.
beforeAll(async () => {
	await import('$lib/stores/rosaryStreak.svelte');
	await import('$lib/stores/angelusStreak.svelte');
}, 60_000);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(T0);
	localStorage.clear();
	fetchMock.mockReset();
	fetchMock.mockImplementation(ok);
	globalThis.fetch = fetchMock as unknown as typeof fetch;
	standalone = false;
	online = true;
});
afterEach(() => {
	for (const [type, listener] of added.splice(0)) window.removeEventListener(type, listener);
	vi.clearAllTimers();
	vi.useRealTimers();
});

describe('rosary streak', () => {
	it('starts empty', async () => {
		const s = await rosary();
		expect(s.length).toBe(0);
		expect(s.lastPrayed).toBeNull();
		expect(s.prayedToday).toBe(false);
		expect(s.isLoggedIn).toBe(false);
	});

	it('loads what localStorage holds', async () => {
		localStorage.setItem('rosary_streak', JSON.stringify({ length: 4, lastPrayed: '2026-09-10', lastPrayedTs: T0 - 1000 }));
		const s = await rosary();
		expect(s.length).toBe(4);
		expect(s.prayedToday).toBe(true);
	});

	it('the first prayer starts a streak of one, stored locally, not sent when logged out', async () => {
		const s = await rosary();
		await s.recordPrayer();
		expect(s.length).toBe(1);
		expect(s.lastPrayed).toBe('2026-09-10');
		expect(stored('rosary_streak')).toEqual({ length: 1, lastPrayed: '2026-09-10', lastPrayedTs: T0 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('praying twice on one day counts once', async () => {
		const s = await rosary();
		await s.recordPrayer();
		vi.setSystemTime(T0 + 3600_000);
		await s.recordPrayer();
		expect(s.length).toBe(1);
		expect(stored('rosary_streak').lastPrayedTs).toBe(T0);
	});

	it('the next day grows the streak; the day rolls over at local midnight', async () => {
		const s = await rosary();
		await s.recordPrayer();
		vi.setSystemTime(T0 + DAY);
		expect(s.prayedToday).toBe(false);
		expect(s.length).toBe(1);
		await s.recordPrayer();
		expect(s.length).toBe(2);
		expect(s.lastPrayed).toBe('2026-09-11');
	});

	it('a gap of 48 hours or more ends the streak; the next prayer starts at one', async () => {
		const s = await rosary();
		await s.recordPrayer();
		vi.setSystemTime(T0 + DAY);
		await s.recordPrayer();
		vi.setSystemTime(T0 + 3 * DAY);
		expect(s.length).toBe(0);
		await s.recordPrayer();
		expect(s.length).toBe(1);
	});

	it('within 48 hours by timestamp the streak lives even two calendar days later', async () => {
		localStorage.setItem('rosary_streak', JSON.stringify({ length: 5, lastPrayed: '2026-09-08', lastPrayedTs: T0 - 47 * 3600_000 }));
		const s = await rosary();
		expect(s.length).toBe(5);
	});

	it('legacy data without a timestamp lives only if it was yesterday', async () => {
		localStorage.setItem('rosary_streak', JSON.stringify({ length: 3, lastPrayed: '2026-09-09' }));
		let s = await rosary();
		expect(s.length).toBe(3);
		await s.recordPrayer();
		expect(s.length).toBe(4);

		localStorage.setItem('rosary_streak', JSON.stringify({ length: 3, lastPrayed: '2026-09-08' }));
		s = await rosary();
		expect(s.length).toBe(0);
		await s.recordPrayer();
		expect(s.length).toBe(1);
	});

	it('logged in, a prayer is posted to the server', async () => {
		const s = await rosary();
		s.initWithServerData(null, true);
		await s.recordPrayer();
		expect(posts()).toEqual([
			{ url: '/api/glaube/rosary-streak', method: 'POST', body: { length: 1, lastPrayed: '2026-09-10', lastPrayedTs: T0 } }
		]);
	});

	it('logged out or without server data, init changes nothing', async () => {
		localStorage.setItem('rosary_streak', JSON.stringify({ length: 2, lastPrayed: '2026-09-10', lastPrayedTs: T0 }));
		const s = await rosary();
		s.initWithServerData({ length: 9, lastPrayed: '2026-09-10', lastPrayedTs: T0 }, false);
		expect(s.length).toBe(2);
		expect(s.isLoggedIn).toBe(false);
		s.initWithServerData(null, true);
		expect(s.length).toBe(2);
		expect(s.isLoggedIn).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	describe('merging local and server data', () => {
		const merge = async (local: object | null, server: object) => {
			if (local) localStorage.setItem('rosary_streak', JSON.stringify(local));
			const s = await rosary();
			s.initWithServerData(server as never, true);
			await flush();
			return s;
		};

		it('same day: the longer streak wins, the local timestamp is kept', async () => {
			const s = await merge({ length: 2, lastPrayed: '2026-09-10', lastPrayedTs: T0 - 10 }, { length: 7, lastPrayed: '2026-09-10', lastPrayedTs: T0 - 20 });
			expect(s.length).toBe(7);
			expect(stored('rosary_streak')).toEqual({ length: 7, lastPrayed: '2026-09-10', lastPrayedTs: T0 - 10 });
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('same day, local longer: pushed back to the server', async () => {
			const s = await merge({ length: 8, lastPrayed: '2026-09-10', lastPrayedTs: T0 - 10 }, { length: 7, lastPrayed: '2026-09-10', lastPrayedTs: null });
			expect(s.length).toBe(8);
			expect(posts()).toEqual([
				{ url: '/api/glaube/rosary-streak', method: 'POST', body: { length: 8, lastPrayed: '2026-09-10', lastPrayedTs: T0 - 10 } }
			]);
		});

		it('different days: the more recent timestamp wins', async () => {
			const s = await merge({ length: 3, lastPrayed: '2026-09-09', lastPrayedTs: T0 - DAY }, { length: 6, lastPrayed: '2026-09-10', lastPrayedTs: T0 - 5 });
			expect(s.length).toBe(6);
			expect(s.lastPrayed).toBe('2026-09-10');
		});

		it('different days without timestamps: the later date wins', async () => {
			const s = await merge({ length: 3, lastPrayed: '2026-09-10' }, { length: 6, lastPrayed: '2026-09-09' });
			expect(s.length).toBe(3);
			expect(posts()[0].body).toEqual({ length: 3, lastPrayed: '2026-09-10', lastPrayedTs: null });
		});

		it('nothing local: the server wins', async () => {
			const s = await merge(null, { length: 4, lastPrayed: '2026-09-09', lastPrayedTs: T0 - DAY });
			expect(s.length).toBe(4);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('an expired streak is reset to zero, stored and pushed', async () => {
			const s = await merge(null, { length: 4, lastPrayed: '2026-09-01', lastPrayedTs: T0 - 9 * DAY });
			expect(s.length).toBe(0);
			expect(s.lastPrayed).toBeNull();
			expect(stored('rosary_streak')).toEqual({ length: 0, lastPrayed: null, lastPrayedTs: null });
			expect(posts()).toEqual([
				{ url: '/api/glaube/rosary-streak', method: 'POST', body: { length: 0, lastPrayed: null, lastPrayedTs: null } }
			]);
		});
	});

	it('a failed post is retried when the browser comes back online', async () => {
		const s = await rosary();
		s.initWithServerData(null, true);
		fetchMock.mockImplementation(notOk);
		await s.recordPrayer();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		fetchMock.mockImplementation(ok);
		window.dispatchEvent(new Event('online'));
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(2);
		// Synced now: a second online event sends nothing.
		window.dispatchEvent(new Event('online'));
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('a thrown fetch counts as a failed post', async () => {
		const s = await rosary();
		s.initWithServerData(null, true);
		fetchMock.mockImplementation(() => Promise.reject(new Error('offline')));
		await s.recordPrayer();
		fetchMock.mockImplementation(ok);
		window.dispatchEvent(new Event('online'));
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('offline in the PWA, a failed post is retried by a 30 s poll', async () => {
		standalone = true;
		online = false;
		const s = await rosary();
		s.initWithServerData(null, true);
		fetchMock.mockImplementation(notOk);
		await s.recordPrayer();
		fetchMock.mockImplementation(ok);
		await vi.advanceTimersByTimeAsync(30_000);
		expect(fetchMock).toHaveBeenCalledTimes(1); // still offline
		online = true;
		await vi.advanceTimersByTimeAsync(30_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(fetchMock).toHaveBeenCalledTimes(2); // the poll stopped
	});

	it('offline outside the PWA, there is no poll', async () => {
		online = false;
		const s = await rosary();
		s.initWithServerData(null, true);
		fetchMock.mockImplementation(notOk);
		await s.recordPrayer();
		online = true;
		await vi.advanceTimersByTimeAsync(120_000);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('going offline with unsynced changes starts the poll in the PWA', async () => {
		const s = await rosary();
		s.initWithServerData(null, true);
		fetchMock.mockImplementation(notOk);
		await s.recordPrayer();
		standalone = true;
		online = false;
		window.dispatchEvent(new Event('offline'));
		fetchMock.mockImplementation(ok);
		online = true;
		await vi.advanceTimersByTimeAsync(30_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

describe('Angelus streak', () => {
	const KEY = 'angelus_streak';

	it('starts empty', async () => {
		const { getAngelusStreak } = await angelusModule();
		const s = getAngelusStreak();
		expect(s.streak).toBe(0);
		expect(s.todayPrayed).toBe(0);
		expect(s.todayComplete).toBe(false);
		expect(s.lastComplete).toBeNull();
	});

	it('picks the slot by the hour', async () => {
		const { getCurrentTimeSlot } = await angelusModule();
		vi.setSystemTime(new Date(2026, 8, 10, 9, 59));
		expect(getCurrentTimeSlot()).toBe('morning');
		vi.setSystemTime(new Date(2026, 8, 10, 10, 0));
		expect(getCurrentTimeSlot()).toBe('noon');
		vi.setSystemTime(new Date(2026, 8, 10, 14, 59));
		expect(getCurrentTimeSlot()).toBe('noon');
		vi.setSystemTime(new Date(2026, 8, 10, 15, 0));
		expect(getCurrentTimeSlot()).toBe('evening');
	});

	it('each slot is recorded once; the third completes the day and starts a streak', async () => {
		const { getAngelusStreak } = await angelusModule();
		const s = getAngelusStreak();
		expect(await s.recordPrayer('morning')).toBe(false);
		expect(s.isSlotPrayed('morning')).toBe(true);
		expect(s.isSlotPrayed('noon')).toBe(false);
		expect(await s.recordPrayer('morning')).toBe(false);
		expect(s.todayPrayed).toBe(1);
		expect(await s.recordPrayer('evening')).toBe(false);
		expect(s.todayPrayed).toBe(5);
		expect(s.streak).toBe(0);
		expect(await s.recordPrayer('noon')).toBe(true);
		expect(s.todayComplete).toBe(true);
		expect(s.streak).toBe(1);
		expect(s.lastComplete).toBe('2026-09-10');
		expect(stored(KEY)).toEqual({ streak: 1, lastComplete: '2026-09-10', lastCompleteTs: T0, todayPrayed: 7, todayDate: '2026-09-10' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('the slots reset at the day rollover; completing the next day grows the streak', async () => {
		const { getAngelusStreak } = await angelusModule();
		const s = getAngelusStreak();
		for (const slot of ['morning', 'noon', 'evening'] as const) await s.recordPrayer(slot);
		vi.setSystemTime(T0 + DAY);
		expect(s.todayPrayed).toBe(0);
		expect(s.isSlotPrayed('morning')).toBe(false);
		expect(s.streak).toBe(1);
		await s.recordPrayer('noon');
		expect(s.todayPrayed).toBe(2);
		expect(stored(KEY).todayDate).toBe('2026-09-11');
		await s.recordPrayer('morning');
		expect(await s.recordPrayer('evening')).toBe(true);
		expect(s.streak).toBe(2);
		expect(s.lastComplete).toBe('2026-09-11');
	});

	it('a gap ends the streak; the next complete day starts at one', async () => {
		const { getAngelusStreak } = await angelusModule();
		const s = getAngelusStreak();
		for (const slot of ['morning', 'noon', 'evening'] as const) await s.recordPrayer(slot);
		vi.setSystemTime(T0 + 3 * DAY);
		expect(s.streak).toBe(0);
		for (const slot of ['morning', 'noon', 'evening'] as const) await s.recordPrayer(slot);
		expect(s.streak).toBe(1);
	});

	it('a stale day in storage loads with no slots prayed', async () => {
		localStorage.setItem(KEY, JSON.stringify({ streak: 3, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 7, todayDate: '2026-09-09' }));
		const { getAngelusStreak } = await angelusModule();
		const s = getAngelusStreak();
		expect(s.todayPrayed).toBe(0);
		expect(s.streak).toBe(3);
		expect(s.lastComplete).toBe('2026-09-09');
	});

	it('legacy data without a timestamp lives only if it was yesterday', async () => {
		localStorage.setItem(KEY, JSON.stringify({ streak: 3, lastComplete: '2026-09-09', todayPrayed: 0, todayDate: null }));
		let { getAngelusStreak } = await angelusModule();
		expect(getAngelusStreak().streak).toBe(3);
		localStorage.setItem(KEY, JSON.stringify({ streak: 3, lastComplete: '2026-09-08', todayPrayed: 0, todayDate: null }));
		({ getAngelusStreak } = await angelusModule());
		expect(getAngelusStreak().streak).toBe(0);
	});

	it('logged in, each slot is posted to the server', async () => {
		const { getAngelusStreak } = await angelusModule();
		const s = getAngelusStreak();
		s.initWithServerData(null, true);
		await s.recordPrayer('noon');
		expect(posts()).toEqual([
			{
				url: '/api/glaube/angelus-streak',
				method: 'POST',
				body: { streak: 0, lastComplete: null, lastCompleteTs: null, todayPrayed: 2, todayDate: '2026-09-10' }
			}
		]);
	});

	describe('merging local and server data', () => {
		const merge = async (local: object | null, server: object) => {
			if (local) localStorage.setItem(KEY, JSON.stringify(local));
			const { getAngelusStreak } = await angelusModule();
			const s = getAngelusStreak();
			s.initWithServerData(server as never, true);
			await flush();
			return s;
		};

		it("today's slots are the union of both sides", async () => {
			const s = await merge(
				{ streak: 2, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 1, todayDate: '2026-09-10' },
				{ streak: 2, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY - 5, todayPrayed: 4, todayDate: '2026-09-10' }
			);
			expect(s.todayPrayed).toBe(5);
			expect(s.streak).toBe(2);
			expect(stored(KEY)).toEqual({ streak: 2, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 5, todayDate: '2026-09-10' });
			expect(posts()).toHaveLength(1);
			expect(posts()[0].body.todayPrayed).toBe(5);
		});

		it("yesterday's slots on either side are dropped", async () => {
			const s = await merge(
				{ streak: 1, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 3, todayDate: '2026-09-09' },
				{ streak: 1, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 4, todayDate: '2026-09-09' }
			);
			expect(s.todayPrayed).toBe(0);
			expect(stored(KEY).todayDate).toBeNull();
		});

		it('same last day: the higher streak wins', async () => {
			const s = await merge(
				{ streak: 5, lastComplete: '2026-09-09', lastCompleteTs: null, todayPrayed: 0, todayDate: null },
				{ streak: 3, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 0, todayDate: null }
			);
			expect(s.streak).toBe(5);
			expect(stored(KEY).lastCompleteTs).toBe(T0 - DAY);
		});

		it('different days: the more recent timestamp wins', async () => {
			const s = await merge(
				{ streak: 9, lastComplete: '2026-09-08', lastCompleteTs: T0 - 2 * DAY + 3600_000, todayPrayed: 0, todayDate: null },
				{ streak: 2, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 0, todayDate: null }
			);
			expect(s.streak).toBe(2);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('different days without timestamps: the later date wins', async () => {
			const s = await merge(
				{ streak: 9, lastComplete: '2026-09-09', todayPrayed: 0, todayDate: null },
				{ streak: 2, lastComplete: '2026-09-08', todayPrayed: 0, todayDate: null }
			);
			expect(s.streak).toBe(9);
		});

		it('one side empty: the other wins', async () => {
			let s = await merge(null, { streak: 4, lastComplete: '2026-09-09', lastCompleteTs: T0 - DAY, todayPrayed: 0, todayDate: null });
			expect(s.streak).toBe(4);
			localStorage.clear();
			fetchMock.mockClear();
			s = await merge(
				{ streak: 6, lastComplete: '2026-09-10', lastCompleteTs: T0, todayPrayed: 7, todayDate: '2026-09-10' },
				{ streak: 0, lastComplete: null, lastCompleteTs: null, todayPrayed: 0, todayDate: null }
			);
			expect(s.streak).toBe(6);
			expect(posts()).toHaveLength(1);
		});

		it('an expired streak is reset but keeps the slots prayed today', async () => {
			const s = await merge(null, { streak: 4, lastComplete: '2026-09-01', lastCompleteTs: T0 - 9 * DAY, todayPrayed: 2, todayDate: '2026-09-10' });
			expect(s.streak).toBe(0);
			expect(s.todayPrayed).toBe(2);
			expect(stored(KEY)).toEqual({ streak: 0, lastComplete: null, lastCompleteTs: null, todayPrayed: 2, todayDate: '2026-09-10' });
			expect(posts()[0].body).toEqual({ streak: 0, lastComplete: null, lastCompleteTs: null, todayPrayed: 2, todayDate: '2026-09-10' });
		});
	});

	it('a failed post is retried online, and by the 30 s poll offline in the PWA', async () => {
		const { getAngelusStreak } = await angelusModule();
		const s = getAngelusStreak();
		s.initWithServerData(null, true);
		fetchMock.mockImplementation(notOk);
		await s.recordPrayer('morning');
		fetchMock.mockImplementation(ok);
		window.dispatchEvent(new Event('online'));
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(2);

		standalone = true;
		online = false;
		window.dispatchEvent(new Event('offline'));
		fetchMock.mockImplementation(notOk);
		await s.recordPrayer('noon');
		expect(fetchMock).toHaveBeenCalledTimes(3);
		fetchMock.mockImplementation(ok);
		online = true;
		await vi.advanceTimersByTimeAsync(30_000);
		expect(fetchMock).toHaveBeenCalledTimes(4);
		expect(posts()[3].body.todayPrayed).toBe(3);
	});
});

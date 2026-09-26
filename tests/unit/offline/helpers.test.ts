import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const env = vi.hoisted(() => ({ browser: true }));
vi.mock('$app/environment', () => ({
	get browser() {
		return env.browser;
	}
}));

const db = vi.hoisted(() => ({ isOfflineDataAvailable: vi.fn<() => Promise<boolean>>() }));
vi.mock('$lib/offline/db', () => db);

import { loadWithOfflineFallback, overlayOfflineData } from '$lib/offline/helpers';

let onLine = true;

beforeEach(() => {
	env.browser = true;
	onLine = true;
	vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onLine);
	// jsdom has no IndexedDB; canUseOfflineData() only checks it exists.
	vi.stubGlobal('indexedDB', {});
	db.isOfflineDataAvailable.mockReset().mockResolvedValue(true);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function sources() {
	return {
		online: vi.fn(async () => ({ items: ['net'], isOffline: false })),
		offline: vi.fn(async () => ({ items: ['idb'], isOffline: true })),
		label: 'items'
	};
}

describe('loadWithOfflineFallback', () => {
	it('online: uses the network and never touches IndexedDB', async () => {
		const s = sources();
		expect(await loadWithOfflineFallback(s)).toEqual({ items: ['net'], isOffline: false });
		expect(s.offline).not.toHaveBeenCalled();
		expect(db.isOfflineDataAvailable).not.toHaveBeenCalled();
	});

	it('known offline: serves IndexedDB without trying the network', async () => {
		onLine = false;
		const s = sources();
		expect(await loadWithOfflineFallback(s)).toEqual({ items: ['idb'], isOffline: true });
		expect(s.online).not.toHaveBeenCalled();
	});

	it('known offline without synced data: falls through to the network', async () => {
		onLine = false;
		db.isOfflineDataAvailable.mockResolvedValue(false);
		const s = sources();
		expect(await loadWithOfflineFallback(s)).toEqual({ items: ['net'], isOffline: false });
		expect(s.offline).not.toHaveBeenCalled();
	});

	it('known offline, IndexedDB read fails: logs and falls through to the network', async () => {
		onLine = false;
		const s = sources();
		s.offline.mockRejectedValueOnce(new Error('idb broke'));
		expect(await loadWithOfflineFallback(s)).toEqual({ items: ['net'], isOffline: false });
		expect(console.error).toHaveBeenCalledWith('Failed to load offline items:', expect.any(Error));
	});

	it('network error while "online": falls back to IndexedDB', async () => {
		const s = sources();
		s.online.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		expect(await loadWithOfflineFallback(s)).toEqual({ items: ['idb'], isOffline: true });
		expect(s.online).toHaveBeenCalledOnce();
		expect(s.offline).toHaveBeenCalledOnce();
	});

	it('network error and no synced data: rethrows the network error', async () => {
		db.isOfflineDataAvailable.mockResolvedValue(false);
		const s = sources();
		const err = new TypeError('Failed to fetch');
		s.online.mockRejectedValueOnce(err);
		await expect(loadWithOfflineFallback(s)).rejects.toBe(err);
	});

	it('on the server: network only, errors propagate', async () => {
		env.browser = false;
		const s = sources();
		const err = new Error('boom');
		s.online.mockRejectedValueOnce(err);
		await expect(loadWithOfflineFallback(s)).rejects.toBe(err);
		expect(s.offline).not.toHaveBeenCalled();
		expect(db.isOfflineDataAvailable).not.toHaveBeenCalled();
	});

	it('without IndexedDB: no fallback even when offline', async () => {
		onLine = false;
		vi.stubGlobal('indexedDB', undefined);
		const s = sources();
		expect(await loadWithOfflineFallback(s)).toEqual({ items: ['net'], isOffline: false });
		expect(s.offline).not.toHaveBeenCalled();
	});
});

describe('overlayOfflineData', () => {
	const serverData = { recipes: [{ id: 1 }], label: 'x' };
	const opts = () => ({
		label: 'data',
		isEmpty: (d: { recipes: unknown[] }) => !d.recipes.length,
		offline: vi.fn(async () => ({ recipes: [{ id: 2 }] }))
	});

	it('server side: passes data through', async () => {
		env.browser = false;
		onLine = false;
		const o = opts();
		expect(await overlayOfflineData(serverData, o)).toEqual({ ...serverData, isOffline: false });
		expect(o.offline).not.toHaveBeenCalled();
	});

	it('online with server data: passes data through', async () => {
		const o = opts();
		expect(await overlayOfflineData(serverData, o)).toEqual({ ...serverData, isOffline: false });
		expect(o.offline).not.toHaveBeenCalled();
	});

	it('offline: overlays IndexedDB data', async () => {
		onLine = false;
		expect(await overlayOfflineData(serverData, opts())).toEqual({
			recipes: [{ id: 2 }],
			label: 'x',
			isOffline: true
		});
	});

	it('server flagged offline: overlays IndexedDB data', async () => {
		const res = await overlayOfflineData({ ...serverData, isOffline: true }, opts());
		expect(res).toMatchObject({ recipes: [{ id: 2 }], isOffline: true });
	});

	it('empty server data: overlays IndexedDB data', async () => {
		const res = await overlayOfflineData({ recipes: [] }, opts());
		expect(res).toEqual({ recipes: [{ id: 2 }], isOffline: true });
	});

	it('offline without synced data, or a failing read: passes data through', async () => {
		onLine = false;
		db.isOfflineDataAvailable.mockResolvedValueOnce(false);
		expect(await overlayOfflineData(serverData, opts())).toEqual({ ...serverData, isOffline: false });

		const o = opts();
		o.offline.mockRejectedValueOnce(new Error('idb broke'));
		expect(await overlayOfflineData(serverData, o)).toEqual({ ...serverData, isOffline: false });
		expect(console.error).toHaveBeenCalledWith('Failed to load offline data:', expect.any(Error));
	});
});

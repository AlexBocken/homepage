import { browser } from '$app/environment';
import { isOfflineDataAvailable } from '$lib/offline/db';

export function isOffline(): boolean {
	return browser && !navigator.onLine;
}

export function canUseOfflineData(): boolean {
	return browser && typeof indexedDB !== 'undefined';
}

/**
 * Run `load` against the IndexedDB copy if one has been synced. Resolves to
 * `null` when there is none or reading it fails (logged as
 * "Failed to load offline <label>:").
 */
async function tryOffline<T>(load: () => Promise<T>, label: string): Promise<T | null> {
	try {
		if (await isOfflineDataAvailable()) return await load();
	} catch (error) {
		console.error(`Failed to load offline ${label}:`, error);
	}
	return null;
}

/**
 * Client-side loader that prefers the network but keeps the PWA useful
 * without it:
 *
 * 1. Device known offline (and IndexedDB usable) → `offline()` if synced data
 *    exists; otherwise fall through to the network.
 * 2. `online()` — the API fetch.
 * 3. `online()` threw (network error) → `offline()` if synced data exists,
 *    else the original error is rethrown.
 */
export async function loadWithOfflineFallback<T>(opts: {
	online: () => Promise<T>;
	offline: () => Promise<T>;
	/** What is being loaded, for the error log ("categories", "tags", ...). */
	label: string;
}): Promise<T> {
	const { online, offline, label } = opts;

	if (browser && isOffline() && canUseOfflineData()) {
		const result = await tryOffline(offline, label);
		if (result !== null) return result;
	}

	try {
		return await online();
	} catch (error) {
		if (browser && canUseOfflineData()) {
			const result = await tryOffline(offline, label);
			if (result !== null) return result;
		}
		throw error;
	}
}

/**
 * Universal-load counterpart of a server load: passes the server `data`
 * through, but on the client replaces it with IndexedDB data when the device
 * is offline, the server said it was offline, or `isEmpty(data)` holds.
 *
 * On the server, or when no synced data exists (or reading it fails), the
 * result is `{ ...data, isOffline: false }`; otherwise
 * `{ ...data, ...await offline(), isOffline: true }`.
 */
export async function overlayOfflineData<D extends object, O extends object>(
	data: D,
	opts: {
		isEmpty: (data: D) => boolean;
		offline: () => Promise<O>;
		/** What is being loaded, for the error log ("data", "season data", ...). */
		label: string;
	}
): Promise<(D & { isOffline: false }) | (D & O & { isOffline: true })> {
	if (!browser) {
		return { ...data, isOffline: false as const };
	}

	const shouldUseOfflineData =
		(isOffline() || (data as { isOffline?: unknown })?.isOffline || opts.isEmpty(data)) &&
		canUseOfflineData();

	if (shouldUseOfflineData) {
		const overlay = await tryOffline(opts.offline, opts.label);
		if (overlay !== null) {
			return { ...data, ...overlay, isOffline: true as const };
		}
	}

	return { ...data, isOffline: false as const };
}

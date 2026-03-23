/**
 * Offline outbox for fitness sessions that failed to POST.
 * Stores them in IndexedDB and flushes when back online.
 */

const DB_NAME = 'fitness-outbox';
const DB_VERSION = 1;
const STORE = 'sessions';

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function queueSession(sessionData: unknown): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).add({ data: sessionData, queuedAt: Date.now() });
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getQueuedSessions(): Promise<Array<{ id: number; data: unknown; queuedAt: number }>> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).getAll();
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function removeSession(id: number): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

/** Try POSTing all queued sessions. Returns count of successfully synced. */
export async function flushQueue(): Promise<number> {
	const sessions = await getQueuedSessions();
	if (sessions.length === 0) return 0;

	let synced = 0;
	for (const entry of sessions) {
		try {
			const res = await fetch('/api/fitness/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(entry.data)
			});
			if (res.ok) {
				await removeSession(entry.id);
				synced++;
			}
		} catch {
			// Still offline — stop trying
			break;
		}
	}
	return synced;
}

/**
 * Small helpers the hike build scripts (build-hikes, build-hike-travel,
 * build-private-images, staticHikeMap, generate-hike-alt-text) all need.
 */

import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';

/** Whether anything exists at `p` (file or directory). Never throws. */
export async function pathExists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

/**
 * Map `worker` over `items` with at most `limit` calls in flight, taking items
 * strictly in order. Results come back in input order. For sharp pipelines,
 * which release the JS thread while libvips runs, a small pool gives a
 * near-linear speed-up.
 */
export async function runWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (true) {
			const i = next++;
			if (i >= items.length) return;
			results[i] = await worker(items[i], i);
		}
	});
	await Promise.all(runners);
	return results;
}

/**
 * First 8 hex digits of the SHA-256 of `data` (strings hash as UTF-8). Used
 * for content-addressed output filenames and cache-busting queries, and as the
 * key alt-text.json uses to tell whether a photo changed.
 */
export function shortHash(data: Buffer | string): string {
	return crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
}

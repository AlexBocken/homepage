/**
 * In-memory cache of full-resolution image Blob URLs keyed by waypoint id.
 *
 * Storing the original File as a base64 data URL would blow past the
 * localStorage quota almost immediately, so the persisted draft only carries
 * a 360w WebP thumbnail. The full-resolution preview lives here only for the
 * lifetime of the page — on reload, callers fall back to the thumbnail.
 *
 * Backed by a Svelte 5 `$state` proxy so the table re-renders the moment a
 * fresh Blob URL is registered (e.g. after image upload or re-attach).
 */

import { browser } from '$app/environment';

const urls = $state<Record<string, string>>({});

export function setFullImage(waypointId: string, file: Blob): void {
	if (!browser) return;
	const old = urls[waypointId];
	if (old) URL.revokeObjectURL(old);
	urls[waypointId] = URL.createObjectURL(file);
}

export function getFullImageUrl(waypointId: string): string | undefined {
	return urls[waypointId];
}

export function dropFullImage(waypointId: string): void {
	if (!browser) return;
	const url = urls[waypointId];
	if (url) URL.revokeObjectURL(url);
	delete urls[waypointId];
}

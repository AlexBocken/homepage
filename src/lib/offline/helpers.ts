import { browser } from '$app/environment';

export function isOffline(): boolean {
	return browser && !navigator.onLine;
}

export function canUseOfflineData(): boolean {
	return browser && typeof indexedDB !== 'undefined';
}

import { browser } from '$app/environment';
import { isOfflineDataAvailable, getLastSync, clearOfflineData } from '$lib/offline/db';
import { downloadAllRecipes, type SyncResult, type SyncProgress } from '$lib/offline/sync';

const AUTO_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
const LAST_SYNC_KEY = 'bocken-last-sync-time';

type PWAState = {
	isOfflineAvailable: boolean;
	isSyncing: boolean;
	lastSyncDate: string | null;
	recipeCount: number;
	error: string | null;
	isStandalone: boolean;
	isInitialized: boolean;
	syncProgress: SyncProgress | null;
};

function createPWAStore() {
	let state = $state<PWAState>({
		isOfflineAvailable: false,
		isSyncing: false,
		lastSyncDate: null,
		recipeCount: 0,
		error: null,
		isStandalone: false,
		isInitialized: false,
		syncProgress: null
	});

	let autoSyncInterval: ReturnType<typeof setInterval> | null = null;

	// Check if running as installed PWA (standalone mode)
	function checkStandaloneMode(): boolean {
		if (!browser) return false;

		// Check display-mode media query (works on most browsers)
		const standaloneQuery = window.matchMedia('(display-mode: standalone)');
		if (standaloneQuery.matches) return true;

		// Check iOS Safari standalone mode
		if ('standalone' in navigator && (navigator as any).standalone === true) return true;

		// Check if launched from home screen on Android
		if (document.referrer.includes('android-app://')) return true;

		return false;
	}

	// Check if we should auto-sync (online and enough time has passed)
	function shouldAutoSync(): boolean {
		if (!browser || !navigator.onLine) return false;

		const lastSync = localStorage.getItem(LAST_SYNC_KEY);
		if (!lastSync) return true; // Never synced, should sync

		const lastSyncTime = parseInt(lastSync, 10);
		const now = Date.now();
		return now - lastSyncTime >= AUTO_SYNC_INTERVAL;
	}

	// Record sync time
	function recordSyncTime() {
		if (browser) {
			localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
		}
	}

	// Auto-sync if conditions are met
	async function autoSync() {
		if (!navigator.onLine || state.isSyncing) return;

		if (shouldAutoSync()) {
			console.log('[PWA] Auto-syncing recipes...');
			await store.syncForOffline();
		}
	}

	const store = {
		get isOfflineAvailable() {
			return state.isOfflineAvailable;
		},
		get isSyncing() {
			return state.isSyncing;
		},
		get lastSyncDate() {
			return state.lastSyncDate;
		},
		get recipeCount() {
			return state.recipeCount;
		},
		get error() {
			return state.error;
		},
		get isStandalone() {
			return state.isStandalone;
		},
		get isInitialized() {
			return state.isInitialized;
		},
		get syncProgress() {
			return state.syncProgress;
		},

		async initialize() {
			if (!browser || state.isInitialized) return;

			state.isStandalone = checkStandaloneMode();
			await this.checkAvailability();

			// Listen for display mode changes (e.g., when installed)
			const standaloneQuery = window.matchMedia('(display-mode: standalone)');
			standaloneQuery.addEventListener('change', (e) => {
				state.isStandalone = e.matches;
				if (e.matches) {
					// Just became standalone (installed), trigger initial sync
					console.log('[PWA] App installed, starting initial sync...');
					this.syncForOffline();
				}
			});

			// Listen for app installed event
			window.addEventListener('appinstalled', () => {
				console.log('[PWA] App installed event received');
				state.isStandalone = true;
				this.syncForOffline();
			});

			// Start auto-sync if in standalone mode
			if (state.isStandalone) {
				this.startAutoSync();

				// Do initial sync if needed
				if (shouldAutoSync()) {
					this.syncForOffline();
				}
			}

			// Listen for online/offline events
			window.addEventListener('online', () => {
				if (state.isStandalone && shouldAutoSync()) {
					autoSync();
				}
			});

			state.isInitialized = true;
		},

		startAutoSync() {
			if (autoSyncInterval) return; // Already running

			// Check every 5 minutes if we should sync
			autoSyncInterval = setInterval(() => {
				autoSync();
			}, 5 * 60 * 1000); // Check every 5 minutes

			console.log('[PWA] Auto-sync enabled (every 30 minutes)');
		},

		stopAutoSync() {
			if (autoSyncInterval) {
				clearInterval(autoSyncInterval);
				autoSyncInterval = null;
				console.log('[PWA] Auto-sync disabled');
			}
		},

		async checkAvailability() {
			try {
				const available = await isOfflineDataAvailable();
				state.isOfflineAvailable = available;

				if (available) {
					const syncInfo = await getLastSync();
					if (syncInfo) {
						state.lastSyncDate = syncInfo.lastSync;
						state.recipeCount = syncInfo.recipeCount;
					}
				}
			} catch (error) {
				console.error('Failed to check offline availability:', error);
				state.isOfflineAvailable = false;
			}
		},

		async syncForOffline(fetchFn: typeof fetch = fetch): Promise<SyncResult> {
			if (state.isSyncing) {
				return { success: false, recipeCount: 0, error: 'Sync already in progress' };
			}

			state.isSyncing = true;
			state.error = null;
			state.syncProgress = null;

			try {
				const result = await downloadAllRecipes(fetchFn, (progress) => {
					state.syncProgress = progress;
				});

				if (result.success) {
					state.isOfflineAvailable = true;
					state.lastSyncDate = new Date().toISOString();
					state.recipeCount = result.recipeCount;
					recordSyncTime();
				} else {
					state.error = result.error || 'Sync failed';
				}

				return result;
			} finally {
				state.isSyncing = false;
				state.syncProgress = null;
			}
		},

		async clearOfflineData() {
			try {
				await clearOfflineData();
				state.isOfflineAvailable = false;
				state.lastSyncDate = null;
				state.recipeCount = 0;
				state.error = null;
				// Clear sync time so next sync happens immediately
				if (browser) {
					localStorage.removeItem(LAST_SYNC_KEY);
				}
			} catch (error) {
				console.error('Failed to clear offline data:', error);
				state.error = error instanceof Error ? error.message : 'Failed to clear data';
			}
		}
	};

	return store;
}

export const pwaStore = createPWAStore();

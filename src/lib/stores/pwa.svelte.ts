import { isOfflineDataAvailable, getLastSync, clearOfflineData } from '$lib/offline/db';
import { downloadAllRecipes, type SyncResult } from '$lib/offline/sync';

type PWAState = {
	isOfflineAvailable: boolean;
	isSyncing: boolean;
	lastSyncDate: string | null;
	recipeCount: number;
	error: string | null;
};

function createPWAStore() {
	let state = $state<PWAState>({
		isOfflineAvailable: false,
		isSyncing: false,
		lastSyncDate: null,
		recipeCount: 0,
		error: null
	});

	return {
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

			try {
				const result = await downloadAllRecipes(fetchFn);

				if (result.success) {
					state.isOfflineAvailable = true;
					state.lastSyncDate = new Date().toISOString();
					state.recipeCount = result.recipeCount;
				} else {
					state.error = result.error || 'Sync failed';
				}

				return result;
			} finally {
				state.isSyncing = false;
			}
		},

		async clearOfflineData() {
			try {
				await clearOfflineData();
				state.isOfflineAvailable = false;
				state.lastSyncDate = null;
				state.recipeCount = 0;
				state.error = null;
			} catch (error) {
				console.error('Failed to clear offline data:', error);
				state.error = error instanceof Error ? error.message : 'Failed to clear data';
			}
		}
	};
}

export const pwaStore = createPWAStore();

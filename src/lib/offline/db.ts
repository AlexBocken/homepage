import type { BriefRecipeType, RecipeModelType } from '$types/types';
import { isRecipeInSeason, recipeOverlapsMonth } from '$lib/js/seasonRange';

const DB_NAME = 'bocken-recipes';
const DB_VERSION = 3; // v3: dropped multi-entry season index after migration to seasonRanges

const STORE_BRIEF = 'recipes_brief';
const STORE_FULL = 'recipes_full';
const STORE_META = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const db = request.result;
			// Verify all stores exist
			if (
				!db.objectStoreNames.contains(STORE_BRIEF) ||
				!db.objectStoreNames.contains(STORE_FULL) ||
				!db.objectStoreNames.contains(STORE_META)
			) {
				// Database is corrupted, delete and retry
				db.close();
				dbPromise = null;
				const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
				deleteRequest.onsuccess = () => {
					openDB().then(resolve).catch(reject);
				};
				deleteRequest.onerror = () => reject(deleteRequest.error);
				return;
			}
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Delete old stores if they exist (clean upgrade)
			if (db.objectStoreNames.contains(STORE_BRIEF)) {
				db.deleteObjectStore(STORE_BRIEF);
			}
			if (db.objectStoreNames.contains(STORE_FULL)) {
				db.deleteObjectStore(STORE_FULL);
			}
			if (db.objectStoreNames.contains(STORE_META)) {
				db.deleteObjectStore(STORE_META);
			}

			// Brief recipes store - keyed by short_name for quick lookups.
			// Season membership is now driven by date ranges with movable
			// liturgical anchors that can't be expressed as a static index, so
			// season filtering loads all rows and runs the shared evaluator.
			const briefStore = db.createObjectStore(STORE_BRIEF, { keyPath: 'short_name' });
			briefStore.createIndex('category', 'category', { unique: false });

			// Full recipes store - keyed by short_name
			db.createObjectStore(STORE_FULL, { keyPath: 'short_name' });

			// Metadata store for sync info
			db.createObjectStore(STORE_META, { keyPath: 'key' });
		};
	});

	return dbPromise;
}

export async function getAllBriefRecipes(): Promise<BriefRecipeType[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_BRIEF, 'readonly');
		const store = tx.objectStore(STORE_BRIEF);
		const request = store.getAll();

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

export async function getFullRecipe(shortName: string): Promise<RecipeModelType | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_FULL, 'readonly');
		const store = tx.objectStore(STORE_FULL);
		const request = store.get(shortName);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

export async function getBriefRecipesByCategory(category: string): Promise<BriefRecipeType[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_BRIEF, 'readonly');
		const store = tx.objectStore(STORE_BRIEF);
		const index = store.index('category');
		const request = index.getAll(category);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

export async function getBriefRecipesInSeasonOn(date: Date = new Date()): Promise<BriefRecipeType[]> {
	const all = await getAllBriefRecipes();
	return all.filter(r => isRecipeInSeason(r as any, date));
}

export async function getBriefRecipesOverlappingMonth(month: number, year: number = new Date().getFullYear()): Promise<BriefRecipeType[]> {
	const all = await getAllBriefRecipes();
	return all.filter(r => recipeOverlapsMonth(r as any, month, year));
}

export async function getBriefRecipesByTag(tag: string): Promise<BriefRecipeType[]> {
	const allRecipes = await getAllBriefRecipes();
	return allRecipes.filter(recipe => recipe.tags?.includes(tag));
}

export async function getBriefRecipesByIcon(icon: string): Promise<BriefRecipeType[]> {
	const allRecipes = await getAllBriefRecipes();
	return allRecipes.filter(recipe => recipe.icon === icon);
}

export async function getAllCategories(): Promise<string[]> {
	const allRecipes = await getAllBriefRecipes();
	const categories = new Set<string>();
	for (const recipe of allRecipes) {
		if (recipe.category) {
			categories.add(recipe.category);
		}
	}
	return Array.from(categories).sort();
}

export async function getAllTags(): Promise<string[]> {
	const allRecipes = await getAllBriefRecipes();
	const tags = new Set<string>();
	for (const recipe of allRecipes) {
		if (recipe.tags) {
			for (const tag of recipe.tags) {
				tags.add(tag);
			}
		}
	}
	return Array.from(tags).sort();
}

export async function getAllIcons(): Promise<string[]> {
	const allRecipes = await getAllBriefRecipes();
	const icons = new Set<string>();
	for (const recipe of allRecipes) {
		if (recipe.icon) {
			icons.add(recipe.icon);
		}
	}
	return Array.from(icons).sort();
}

export async function saveAllRecipes(
	briefRecipes: BriefRecipeType[],
	fullRecipes: RecipeModelType[]
): Promise<void> {
	const db = await openDB();

	// Clear existing data and save new data in a transaction
	return new Promise((resolve, reject) => {
		const tx = db.transaction([STORE_BRIEF, STORE_FULL, STORE_META], 'readwrite');

		tx.onerror = () => reject(tx.error);
		tx.oncomplete = () => resolve();

		// Clear and repopulate brief recipes
		const briefStore = tx.objectStore(STORE_BRIEF);
		briefStore.clear();
		for (const recipe of briefRecipes) {
			briefStore.put(recipe);
		}

		// Clear and repopulate full recipes
		const fullStore = tx.objectStore(STORE_FULL);
		fullStore.clear();
		for (const recipe of fullRecipes) {
			fullStore.put(recipe);
		}

		// Update sync metadata
		const metaStore = tx.objectStore(STORE_META);
		metaStore.put({
			key: 'lastSync',
			value: new Date().toISOString(),
			recipeCount: briefRecipes.length
		});
	});
}

export async function getLastSync(): Promise<{ lastSync: string; recipeCount: number } | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_META, 'readonly');
		const store = tx.objectStore(STORE_META);
		const request = store.get('lastSync');

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			if (request.result) {
				resolve({
					lastSync: request.result.value,
					recipeCount: request.result.recipeCount
				});
			} else {
				resolve(null);
			}
		};
	});
}

export async function isOfflineDataAvailable(): Promise<boolean> {
	try {
		const syncInfo = await getLastSync();
		return syncInfo !== null && syncInfo.recipeCount > 0;
	} catch {
		return false;
	}
}

export async function clearOfflineData(): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction([STORE_BRIEF, STORE_FULL, STORE_META], 'readwrite');

		tx.onerror = () => reject(tx.error);
		tx.oncomplete = () => resolve();

		tx.objectStore(STORE_BRIEF).clear();
		tx.objectStore(STORE_FULL).clear();
		tx.objectStore(STORE_META).clear();
	});
}

export async function getRecipeCount(): Promise<number> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_BRIEF, 'readonly');
		const store = tx.objectStore(STORE_BRIEF);
		const request = store.count();

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

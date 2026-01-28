import { saveAllRecipes } from './db';
import type { BriefRecipeType, RecipeModelType } from '../../types/types';

export type SyncResult = {
	success: boolean;
	recipeCount: number;
	error?: string;
};

export async function downloadAllRecipes(
	fetchFn: typeof fetch = fetch
): Promise<SyncResult> {
	try {
		const response = await fetchFn('/api/rezepte/offline-db');

		if (!response.ok) {
			throw new Error(`Failed to fetch recipes: ${response.status}`);
		}

		const data: {
			brief: BriefRecipeType[];
			full: RecipeModelType[];
			syncedAt: string;
		} = await response.json();

		// Save to IndexedDB
		await saveAllRecipes(data.brief, data.full);

		// Pre-cache the main recipe pages HTML (needed for offline shell)
		await precacheMainPages(fetchFn);

		// Pre-cache __data.json for all recipes (needed for client-side navigation)
		await precacheRecipeData(data.brief);

		// Pre-cache thumbnail images via service worker
		await precacheThumbnails(data.brief);

		return {
			success: true,
			recipeCount: data.brief.length
		};
	} catch (error) {
		console.error('Offline sync failed:', error);
		return {
			success: false,
			recipeCount: 0,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

async function precacheMainPages(_fetchFn: typeof fetch): Promise<void> {
	// Only attempt if service worker is available
	if (!('serviceWorker' in navigator)) return;

	const registration = await navigator.serviceWorker.ready;
	if (!registration.active) return;

	// Send message to service worker to cache main pages, offline shells, and their data
	// The offline shells are crucial for direct navigation to recipe pages when offline
	registration.active.postMessage({
		type: 'CACHE_PAGES',
		urls: [
			'/rezepte',
			'/recipes',
			'/rezepte/offline-shell',
			'/recipes/offline-shell',
			'/rezepte/__data.json',
			'/recipes/__data.json'
		]
	});
}

async function precacheRecipeData(recipes: BriefRecipeType[]): Promise<void> {
	// Only attempt if service worker is available
	if (!('serviceWorker' in navigator)) return;

	const registration = await navigator.serviceWorker.ready;
	if (!registration.active) return;

	// Collect __data.json URLs for all recipes (both German and English if translated)
	const dataUrls: string[] = [];
	for (const recipe of recipes) {
		// German recipe data
		dataUrls.push(`/rezepte/${recipe.short_name}/__data.json`);

		// English recipe data (if translation exists)
		if (recipe.translations?.en?.short_name) {
			dataUrls.push(`/recipes/${recipe.translations.en.short_name}/__data.json`);
		}
	}

	// Send message to service worker to cache these URLs
	if (dataUrls.length > 0) {
		registration.active.postMessage({
			type: 'CACHE_DATA',
			urls: dataUrls
		});
	}
}

async function precacheThumbnails(recipes: BriefRecipeType[]): Promise<void> {
	// Only attempt if service worker is available
	if (!('serviceWorker' in navigator)) return;

	const registration = await navigator.serviceWorker.ready;
	if (!registration.active) return;

	// Collect all thumbnail URLs
	const thumbnailUrls: string[] = [];
	for (const recipe of recipes) {
		if (recipe.images && recipe.images.length > 0) {
			const mediapath = recipe.images[0].mediapath;
			// Thumbnail path format: /static/rezepte/thumb/{short_name}.webp
			thumbnailUrls.push(`/static/rezepte/thumb/${recipe.short_name}.webp`);
		}
	}

	// Send message to service worker to cache these URLs
	if (thumbnailUrls.length > 0) {
		registration.active.postMessage({
			type: 'CACHE_IMAGES',
			urls: thumbnailUrls
		});
	}
}

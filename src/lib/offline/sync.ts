import { saveAllRecipes } from './db';
import type { BriefRecipeType, RecipeModelType } from '../../types/types';

// Discover glaube routes at build time using Vite's glob import
const glaubePageModules = import.meta.glob('/src/routes/glaube/**/+page.svelte');
const glaubeRoutes = Object.keys(glaubePageModules).map(path => {
	// Convert file path to route path
	// /src/routes/glaube/+page.svelte -> /glaube
	// /src/routes/glaube/angelus/+page.svelte -> /glaube/angelus
	return path
		.replace('/src/routes', '')
		.replace('/+page.svelte', '') || '/glaube';
});

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

	// Build list of pages to cache
	const pagesToCache: string[] = [
		// Root page
		'/',
		'/__data.json',
		// Recipe main pages
		'/rezepte',
		'/recipes',
		'/rezepte/offline-shell',
		'/recipes/offline-shell',
		// Recipe main page data
		'/rezepte/__data.json',
		'/recipes/__data.json',
		// Recipe list pages
		'/rezepte/category',
		'/rezepte/tag',
		'/rezepte/icon',
		'/rezepte/season',
		'/rezepte/favorites',
		'/recipes/category',
		'/recipes/tag',
		'/recipes/icon',
		'/recipes/season',
		'/recipes/favorites',
		// Recipe list page data
		'/rezepte/category/__data.json',
		'/rezepte/tag/__data.json',
		'/rezepte/icon/__data.json',
		'/rezepte/season/__data.json',
		'/rezepte/favorites/__data.json',
		'/recipes/category/__data.json',
		'/recipes/tag/__data.json',
		'/recipes/icon/__data.json',
		'/recipes/season/__data.json',
		'/recipes/favorites/__data.json'
	];

	// Add dynamically discovered glaube routes (HTML and __data.json)
	for (const route of glaubeRoutes) {
		pagesToCache.push(route);
		pagesToCache.push(`${route}/__data.json`);
	}

	// Send message to service worker to cache all pages
	registration.active.postMessage({
		type: 'CACHE_PAGES',
		urls: pagesToCache
	});
}

async function precacheRecipeData(recipes: BriefRecipeType[]): Promise<void> {
	// Only attempt if service worker is available
	if (!('serviceWorker' in navigator)) return;

	const registration = await navigator.serviceWorker.ready;
	if (!registration.active) return;

	// Collect __data.json URLs for all recipes (both German and English if translated)
	const dataUrls: string[] = [];

	// Collect unique categories, tags, and icons
	const categories = new Set<string>();
	const tags = new Set<string>();
	const icons = new Set<string>();

	for (const recipe of recipes) {
		// German recipe data
		dataUrls.push(`/rezepte/${recipe.short_name}/__data.json`);

		// English recipe data (if translation exists)
		if (recipe.translations?.en?.short_name) {
			dataUrls.push(`/recipes/${recipe.translations.en.short_name}/__data.json`);
		}

		// Collect metadata for subroute caching
		if (recipe.category) categories.add(recipe.category);
		if (recipe.icon) icons.add(recipe.icon);
		if (recipe.tags) {
			for (const tag of recipe.tags) {
				tags.add(tag);
			}
		}
	}

	// Add category subroute data
	for (const category of categories) {
		dataUrls.push(`/rezepte/category/${encodeURIComponent(category)}/__data.json`);
		dataUrls.push(`/recipes/category/${encodeURIComponent(category)}/__data.json`);
	}

	// Add tag subroute data
	for (const tag of tags) {
		dataUrls.push(`/rezepte/tag/${encodeURIComponent(tag)}/__data.json`);
		dataUrls.push(`/recipes/tag/${encodeURIComponent(tag)}/__data.json`);
	}

	// Add icon subroute data
	for (const icon of icons) {
		dataUrls.push(`/rezepte/icon/${encodeURIComponent(icon)}/__data.json`);
		dataUrls.push(`/recipes/icon/${encodeURIComponent(icon)}/__data.json`);
	}

	// Add season subroute data (all 12 months)
	for (let month = 1; month <= 12; month++) {
		dataUrls.push(`/rezepte/season/${month}/__data.json`);
		dataUrls.push(`/recipes/season/${month}/__data.json`);
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

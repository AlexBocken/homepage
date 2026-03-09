import { saveAllRecipes } from './db';
import type { BriefRecipeType, RecipeModelType } from '$types/types';
import { validPrayerSlugs } from '$lib/data/prayerSlugs';

// Discover faith routes at build time using Vite's glob import
// The actual directory is [faithLang=faithLang] with parameterized sub-dirs
const faithPageModules = import.meta.glob('/src/routes/\\[faithLang=faithLang\\]/**/+page.svelte');

// Convert file paths to actual route URLs for both language variants
// e.g. /src/routes/[faithLang=faithLang]/[prayers=prayersLang]/+page.svelte
//   -> /glaube/gebete, /faith/prayers
const paramMap: Record<string, [string, string]> = {
	'[faithLang=faithLang]': ['glaube', 'faith'],
	'[prayers=prayersLang]': ['gebete', 'prayers'],
	'[rosary=rosaryLang]': ['rosenkranz', 'rosary'],
};

function expandFaithRoutes(): string[] {
	const routes: string[] = [];
	for (const filePath of Object.keys(faithPageModules)) {
		// Strip prefix and suffix: /src/routes/[faithLang=faithLang]/angelus/+page.svelte -> [faithLang=faithLang]/angelus
		let route = filePath.replace('/src/routes/', '').replace('/+page.svelte', '');

		// Skip routes with dynamic [prayer] segment — those need explicit slug enumeration
		if (route.includes('[prayer]')) continue;

		// Generate both language variants by replacing all param segments
		const segments = route.split('/');
		const deSegments: string[] = [];
		const enSegments: string[] = [];
		for (const seg of segments) {
			if (paramMap[seg]) {
				deSegments.push(paramMap[seg][0]);
				enSegments.push(paramMap[seg][1]);
			} else {
				deSegments.push(seg);
				enSegments.push(seg);
			}
		}
		routes.push('/' + deSegments.join('/'));
		routes.push('/' + enSegments.join('/'));
	}
	return routes;
}

const faithRoutes = expandFaithRoutes();

// Add individual prayer pages (dynamic [prayer] slug, resolved at build time)
for (const slug of validPrayerSlugs) {
	faithRoutes.push(`/glaube/gebete/${slug}`);
	faithRoutes.push(`/faith/prayers/${slug}`);
}

export type SyncProgress = {
	phase: 'recipes' | 'pages' | 'data' | 'images';
	message: string;
	imageProgress?: {
		completed: number;
		total: number;
	};
};

export type SyncResult = {
	success: boolean;
	recipeCount: number;
	error?: string;
};

export type SyncProgressCallback = (progress: SyncProgress) => void;

export async function downloadAllRecipes(
	fetchFn: typeof fetch = fetch,
	onProgress?: SyncProgressCallback
): Promise<SyncResult> {
	try {
		// Phase 1: Download recipe data
		onProgress?.({ phase: 'recipes', message: 'Downloading recipes...' });

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
		onProgress?.({ phase: 'recipes', message: `Saved ${data.brief.length} recipes` });

		// Phase 2: Pre-cache the main pages HTML
		onProgress?.({ phase: 'pages', message: 'Caching pages...' });
		await precacheMainPages(fetchFn);

		// Phase 3: Pre-cache __data.json for all recipes
		onProgress?.({ phase: 'data', message: 'Caching navigation data...' });
		await precacheRecipeData(data.brief);

		// Phase 4: Pre-cache thumbnail images via service worker
		onProgress?.({ phase: 'images', message: 'Caching images...', imageProgress: { completed: 0, total: data.brief.length } });

		await precacheThumbnails(data.brief, (imgProgress) => {
			onProgress?.({
				phase: 'images',
				message: `Caching images (${imgProgress.completed}/${imgProgress.total})...`,
				imageProgress: {
					completed: imgProgress.completed,
					total: imgProgress.total
				}
			});
		});

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

	// Add dynamically discovered faith routes (HTML and __data.json)
	for (const route of faithRoutes) {
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
		if ((recipe as any).translations?.en?.short_name) {
			dataUrls.push(`/recipes/${(recipe as any).translations.en.short_name}/__data.json`);
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

type ImageCacheProgress = {
	completed: number;
	total: number;
	done: boolean;
};

type ProgressCallback = (progress: ImageCacheProgress) => void;

async function precacheThumbnails(
	recipes: BriefRecipeType[],
	onProgress?: ProgressCallback
): Promise<void> {
	// Only attempt if service worker is available
	if (!('serviceWorker' in navigator)) return;

	const registration = await navigator.serviceWorker.ready;
	if (!registration.active) return;

	// Collect all thumbnail URLs using mediapath (includes hash for cache busting)
	const thumbnailUrls: string[] = [];
	for (const recipe of recipes) {
		if (recipe.images && recipe.images.length > 0) {
			const mediapath = recipe.images[0].mediapath;
			// Thumbnail path format: /static/rezepte/thumb/{mediapath}
			thumbnailUrls.push(`/static/rezepte/thumb/${mediapath}`);
		}
	}

	if (thumbnailUrls.length === 0) return;

	// Generate unique request ID
	const requestId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;

	// Create a promise that resolves when caching is complete
	return new Promise((resolve) => {
		function handleMessage(event: MessageEvent) {
			if (event.data?.type === 'CACHE_IMAGES_PROGRESS' && event.data.requestId === requestId) {
				if (onProgress) {
					onProgress({
						completed: event.data.completed,
						total: event.data.total,
						done: event.data.done
					});
				}

				if (event.data.done) {
					navigator.serviceWorker.removeEventListener('message', handleMessage);
					resolve();
				}
			}
		}

		navigator.serviceWorker.addEventListener('message', handleMessage);

		// Send message to service worker to cache these URLs
		registration.active!.postMessage({
			type: 'CACHE_IMAGES',
			urls: thumbnailUrls,
			requestId
		});

		// Timeout fallback in case messages don't arrive
		setTimeout(() => {
			navigator.serviceWorker.removeEventListener('message', handleMessage);
			resolve();
		}, 5 * 60 * 1000); // 5 minute timeout
	});
}

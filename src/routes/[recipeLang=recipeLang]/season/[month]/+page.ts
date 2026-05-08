import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getBriefRecipesOverlappingMonth, isOfflineDataAvailable } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';
import type { PageLoad } from './$types';

function addFavoriteStatus<T extends { _id: unknown }>(
	recipes: T[],
	favorites: string[]
): Array<T & { isFavorite: boolean }> {
	if (!Array.isArray(recipes)) return [];
	return recipes.map((r) => ({
		...r,
		isFavorite: favorites.some((id) => id.toString() === (r._id as { toString(): string }).toString())
	}));
}

async function loadFromIndexedDB(month: number) {
	if (!await isOfflineDataAvailable()) return null;
	const recipes = await getBriefRecipesOverlappingMonth(month);
	return {
		month,
		season: rand_array(recipes),
		isOffline: true as const
	};
}

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const parentData = await parent();
	const month = parseInt(params.month, 10);
	const apiBase = `/api/${params.recipeLang}`;
	const canUseOffline = browser && canUseOfflineData();
	const knownOffline = browser && (isOffline() || parentData.isOffline);

	// Skip the network entirely when device is known offline.
	if (canUseOffline && knownOffline) {
		try {
			const offline = await loadFromIndexedDB(month);
			if (offline) return offline;
		} catch (e) {
			console.error('Failed to load offline season data:', e);
		}
	}

	let item_season: Array<{ _id: unknown }> = [];
	let favorites: string[] = [];
	try {
		const [seasonRes, favRes] = await Promise.all([
			fetch(`${apiBase}/items/in_season/${month}`),
			fetch(`${apiBase}/favorites`).catch(() => null)
		]);
		if (seasonRes.ok) item_season = await seasonRes.json();
		if (favRes && favRes.ok) {
			const body = await favRes.json();
			favorites = body.favorites ?? [];
		}
	} catch {
		// Network unreachable — IndexedDB fallback below picks up the slack.
	}

	// API failed or returned empty (502, slow cellular, server hiccup) — fall
	// back to IndexedDB so the cached PWA shell stays useful.
	if (canUseOffline && !item_season.length) {
		try {
			const offline = await loadFromIndexedDB(month);
			if (offline) return offline;
		} catch (e) {
			console.error('Failed to load offline season data:', e);
		}
	}

	return {
		month,
		season: addFavoriteStatus(item_season, favorites),
		isOffline: false
	};
};

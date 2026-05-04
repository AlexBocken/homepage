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

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const parentData = await parent();
	const month = parseInt(params.month, 10);
	const apiBase = `/api/${params.recipeLang}`;
	const useOfflineData =
		browser && (isOffline() || parentData.isOffline) && canUseOfflineData();

	if (useOfflineData) {
		try {
			if (await isOfflineDataAvailable()) {
				const recipes = await getBriefRecipesOverlappingMonth(month);
				return {
					month,
					season: rand_array(recipes),
					isOffline: true
				};
			}
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
		// Empty arrays — page will render with no recipes
	}

	return {
		month,
		season: addFavoriteStatus(item_season, favorites),
		isOffline: false
	};
};

import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getAllBriefRecipes, getBriefRecipesInSeasonOn, isOfflineDataAvailable } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';
import { isRecipeInSeason } from '$lib/js/seasonRange';
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
	const apiBase = `/api/${params.recipeLang}`;
	const useOfflineData =
		browser && (isOffline() || parentData.isOffline) && canUseOfflineData();

	if (useOfflineData) {
		try {
			if (await isOfflineDataAvailable()) {
				const [allBrief, seasonRecipes] = await Promise.all([
					getAllBriefRecipes(),
					getBriefRecipesInSeasonOn(new Date())
				]);
				return {
					all_brief: rand_array(allBrief),
					season: rand_array(seasonRecipes),
					heroIndex: Math.random(),
					isOffline: true
				};
			}
		} catch (e) {
			console.error('Failed to load offline data:', e);
		}
	}

	let all_brief: Array<{ _id: unknown; icon?: string }> = [];
	let favorites: string[] = [];
	try {
		const [briefRes, favRes] = await Promise.all([
			fetch(`${apiBase}/items/all_brief`),
			fetch(`${apiBase}/favorites`).catch(() => null)
		]);
		if (briefRes.ok) all_brief = await briefRes.json();
		if (favRes && favRes.ok) {
			const body = await favRes.json();
			favorites = body.favorites ?? [];
		}
	} catch {
		// Network unreachable — empty data; +page.svelte renders fallback layout.
	}

	const marked = addFavoriteStatus(all_brief, favorites);
	const today = new Date();
	const season = marked.filter(
		(r) => r.icon !== '🍽️' && isRecipeInSeason(r as Parameters<typeof isRecipeInSeason>[0], today)
	);

	return {
		all_brief: marked,
		season,
		heroIndex: Math.random(),
		isOffline: false
	};
};

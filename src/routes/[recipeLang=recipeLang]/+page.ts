import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getAllBriefRecipes, getBriefRecipesBySeason, isOfflineDataAvailable } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';

export async function load({ data }) {
	// On the server, just pass through the server data unchanged
	if (!browser) {
		return {
			...data,
			isOffline: false
		};
	}

	// On the client, check if we need to load from IndexedDB
	// This happens when:
	// 1. We're offline (navigator.onLine is false)
	// 2. Service worker returned offline flag
	// 3. Server data is missing (e.g., client-side navigation while offline)
	const shouldUseOfflineData = (isOffline() || data?.isOffline || !data?.all_brief?.length) && canUseOfflineData();

	if (shouldUseOfflineData) {
		try {
			const hasOfflineData = await isOfflineDataAvailable();
			if (hasOfflineData) {
				const currentMonth = new Date().getMonth() + 1;

				const [allBrief, seasonRecipes] = await Promise.all([
					getAllBriefRecipes(),
					getBriefRecipesBySeason(currentMonth)
				]);

				return {
					...data,
					all_brief: rand_array(allBrief),
					season: rand_array(seasonRecipes),
					isOffline: true
				};
			}
		} catch (error) {
			console.error('Failed to load offline data:', error);
		}
	}

	// Return server data as-is
	return {
		...data,
		isOffline: false
	};
}

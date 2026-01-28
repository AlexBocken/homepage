import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getBriefRecipesByIcon, getAllBriefRecipes, isOfflineDataAvailable } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';

export async function load({ data, params }) {
	// On the server, just pass through the server data unchanged
	if (!browser) {
		return {
			...data,
			isOffline: false
		};
	}

	// On the client, check if we need to load from IndexedDB
	const shouldUseOfflineData = (isOffline() || data?.isOffline || !data?.season?.length) && canUseOfflineData();

	if (shouldUseOfflineData) {
		try {
			const hasOfflineData = await isOfflineDataAvailable();
			if (hasOfflineData) {
				const [recipes, allRecipes] = await Promise.all([
					getBriefRecipesByIcon(params.icon),
					getAllBriefRecipes()
				]);

				// Extract unique icons from all recipes
				const iconSet = new Set<string>();
				for (const recipe of allRecipes) {
					if (recipe.icon) {
						iconSet.add(recipe.icon);
					}
				}

				return {
					...data,
					season: rand_array(recipes),
					icons: Array.from(iconSet).sort(),
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

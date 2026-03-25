import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getBriefRecipesBySeason, isOfflineDataAvailable } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data, params }) => {
	// On the server, just pass through the server data unchanged
	if (!browser) {
		return {
			...data,
			isOffline: false
		};
	}

	// On the client, check if we need to load from IndexedDB
	const shouldUseOfflineData = (isOffline() || (data as any)?.isOffline || !data?.season?.length) && canUseOfflineData();

	if (shouldUseOfflineData) {
		try {
			const hasOfflineData = await isOfflineDataAvailable();
			if (hasOfflineData) {
				const month = parseInt(params.month);
				const recipes = await getBriefRecipesBySeason(month);

				return {
					...data,
					season: rand_array(recipes),
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
};

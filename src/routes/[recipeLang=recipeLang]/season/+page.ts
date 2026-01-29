import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getBriefRecipesBySeason, isOfflineDataAvailable } from '$lib/offline/db';
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
    const shouldUseOfflineData = (isOffline() || data?.isOffline || !data?.season?.length) && canUseOfflineData();

    if (shouldUseOfflineData) {
        try {
            const hasOfflineData = await isOfflineDataAvailable();
            if (hasOfflineData) {
                const currentMonth = new Date().getMonth() + 1;
                const recipes = await getBriefRecipesBySeason(currentMonth);

                return {
                    ...data,
                    season: rand_array(recipes),
                    isOffline: true
                };
            }
        } catch (error) {
            console.error('Failed to load offline season data:', error);
        }
    }

    // Return server data as-is
    return {
        ...data,
        isOffline: false
    };
}

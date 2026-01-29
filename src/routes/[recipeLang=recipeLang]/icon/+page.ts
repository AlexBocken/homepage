import type { PageLoad } from "./$types";
import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getAllIcons, isOfflineDataAvailable } from '$lib/offline/db';

export const load: PageLoad = async ({ fetch }) => {
    // Check if we should use offline data
    if (browser && isOffline() && canUseOfflineData()) {
        try {
            const hasOfflineData = await isOfflineDataAvailable();
            if (hasOfflineData) {
                const icons = await getAllIcons();
                return { icons, isOffline: true };
            }
        } catch (error) {
            console.error('Failed to load offline icons:', error);
        }
    }

    // Online mode - fetch from API
    try {
        const res_icons = await fetch(`/api/rezepte/items/icon`);
        const icons = await res_icons.json();
        return { icons, isOffline: false };
    } catch (error) {
        // Network error - try offline fallback
        if (browser && canUseOfflineData()) {
            try {
                const hasOfflineData = await isOfflineDataAvailable();
                if (hasOfflineData) {
                    const icons = await getAllIcons();
                    return { icons, isOffline: true };
                }
            } catch (offlineError) {
                console.error('Failed to load offline icons:', offlineError);
            }
        }
        throw error;
    }
};

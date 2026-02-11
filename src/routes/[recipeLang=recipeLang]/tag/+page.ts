import type { PageLoad } from "./$types";
import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getAllTags, isOfflineDataAvailable } from '$lib/offline/db';

export const load: PageLoad = async ({ fetch, params }) => {
    const isEnglish = params.recipeLang === 'recipes';
    const apiBase = `/api/${params.recipeLang}`;

    // Check if we should use offline data
    if (browser && isOffline() && canUseOfflineData()) {
        try {
            const hasOfflineData = await isOfflineDataAvailable();
            if (hasOfflineData) {
                const tags = await getAllTags();
                return { tags, isOffline: true };
            }
        } catch (error) {
            console.error('Failed to load offline tags:', error);
        }
    }

    // Online mode - fetch from API
    try {
        const res = await fetch(`${apiBase}/items/tag`);
        const tags = await res.json();
        return { tags, isOffline: false };
    } catch (error) {
        // Network error - try offline fallback
        if (browser && canUseOfflineData()) {
            try {
                const hasOfflineData = await isOfflineDataAvailable();
                if (hasOfflineData) {
                    const tags = await getAllTags();
                    return { tags, isOffline: true };
                }
            } catch (offlineError) {
                console.error('Failed to load offline tags:', offlineError);
            }
        }
        throw error;
    }
};

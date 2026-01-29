import type { PageLoad } from "./$types";
import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getAllCategories, isOfflineDataAvailable } from '$lib/offline/db';

export const load: PageLoad = async ({ fetch, params }) => {
    const isEnglish = params.recipeLang === 'recipes';
    const apiBase = isEnglish ? '/api/recipes' : '/api/rezepte';

    // Check if we should use offline data
    if (browser && isOffline() && canUseOfflineData()) {
        try {
            const hasOfflineData = await isOfflineDataAvailable();
            if (hasOfflineData) {
                const categories = await getAllCategories();
                return { categories, isOffline: true };
            }
        } catch (error) {
            console.error('Failed to load offline categories:', error);
        }
    }

    // Online mode - fetch from API
    try {
        const res = await fetch(`${apiBase}/items/category`);
        const categories = await res.json();
        return { categories, isOffline: false };
    } catch (error) {
        // Network error - try offline fallback
        if (browser && canUseOfflineData()) {
            try {
                const hasOfflineData = await isOfflineDataAvailable();
                if (hasOfflineData) {
                    const categories = await getAllCategories();
                    return { categories, isOffline: true };
                }
            } catch (offlineError) {
                console.error('Failed to load offline categories:', offlineError);
            }
        }
        throw error;
    }
};

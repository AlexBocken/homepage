import type { PageLoad } from "./$types";
import { browser } from '$app/environment';
import { isOffline, canUseOfflineData } from '$lib/offline/helpers';
import { getAllBriefRecipes, isOfflineDataAvailable } from '$lib/offline/db';

// Store favorites in localStorage for offline access
const FAVORITES_STORAGE_KEY = 'bocken-favorites';

function getStoredFavorites(): string[] {
    if (!browser) return [];
    try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function storeFavorites(favoriteIds: string[]): void {
    if (!browser) return;
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
        // Storage full or unavailable
    }
}

export const load: PageLoad = async ({ data, params }) => {
    const isEnglish = params.recipeLang === 'recipes';

    // If we have server data, store the favorite IDs for offline use
    if (data?.favorites && Array.isArray(data.favorites) && data.favorites.length > 0) {
        const favoriteIds = data.favorites.map((r: any) => r.short_name);
        storeFavorites(favoriteIds);
    }

    // Check if we should use offline data
    const shouldUseOffline = browser && (isOffline() || data?.isOffline) && canUseOfflineData();

    if (shouldUseOffline) {
        try {
            const hasOfflineData = await isOfflineDataAvailable();
            if (hasOfflineData) {
                const storedFavoriteIds = getStoredFavorites();

                if (storedFavoriteIds.length === 0) {
                    return {
                        ...data,
                        favorites: [],
                        isOffline: true,
                        offlineMessage: isEnglish
                            ? 'Favorites are not available offline. Please sync while online first.'
                            : 'Favoriten sind offline nicht verfügbar. Bitte zuerst online synchronisieren.'
                    };
                }

                const allRecipes = await getAllBriefRecipes();
                const favorites = allRecipes
                    .filter(recipe => storedFavoriteIds.includes(recipe.short_name))
                    .map(recipe => ({ ...recipe, isFavorite: true }));

                return {
                    ...data,
                    favorites,
                    isOffline: true
                };
            }
        } catch (error) {
            console.error('Failed to load offline favorites:', error);
        }
    }

    // Return server data as-is
    return {
        ...data,
        isOffline: false
    };
};

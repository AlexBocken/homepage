import { writable, derived } from 'svelte/store';
import { page } from '$app/stores';

export interface FavoritesState {
    favorites: string[]; // Array of ObjectIds
    shortNameToObjectId: Map<string, string>; // Mapping from short_name to ObjectId
    loading: boolean;
    error: string | null;
}

// Create the favorites store
function createFavoritesStore() {
    const { subscribe, set, update } = writable<FavoritesState>({
        favorites: [],
        shortNameToObjectId: new Map(),
        loading: false,
        error: null
    });

    return {
        subscribe,
        
        // Load user's favorites from API
        async load() {
            update(state => ({ ...state, loading: true, error: null }));
            
            try {
                const response = await fetch('/api/rezepte/favorites', {
                    credentials: 'include' // Ensure cookies are sent for authentication
                });
                
                if (response.ok) {
                    const data = await response.json();
                    update(state => ({
                        ...state,
                        favorites: data.favorites || [],
                        loading: false
                    }));
                } else if (response.status === 401) {
                    // User not authenticated, clear favorites
                    update(state => ({
                        ...state,
                        favorites: [],
                        loading: false
                    }));
                } else {
                    throw new Error(`Failed to load favorites: ${response.status}`);
                }
            } catch (error) {
                console.error('Error loading favorites:', error);
                update(state => ({
                    ...state,
                    loading: false,
                    error: error instanceof Error ? error.message : 'Failed to load favorites'
                }));
            }
        },

        // Add a recipe to favorites
        async add(recipeShortName: string) {
            try {
                const response = await fetch('/api/rezepte/favorites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ recipeId: recipeShortName }),
                    credentials: 'include'
                });

                if (response.ok) {
                    // Reload favorites to get the updated list with ObjectIds
                    await this.load();
                } else {
                    throw new Error(`Failed to add favorite: ${response.status}`);
                }
            } catch (error) {
                console.error('Error adding favorite:', error);
                update(state => ({
                    ...state,
                    error: error instanceof Error ? error.message : 'Failed to add favorite'
                }));
            }
        },

        // Remove a recipe from favorites
        async remove(recipeShortName: string) {
            try {
                const response = await fetch('/api/rezepte/favorites', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ recipeId: recipeShortName }),
                    credentials: 'include'
                });

                if (response.ok) {
                    // Reload favorites to get the updated list
                    await this.load();
                } else {
                    throw new Error(`Failed to remove favorite: ${response.status}`);
                }
            } catch (error) {
                console.error('Error removing favorite:', error);
                update(state => ({
                    ...state,
                    error: error instanceof Error ? error.message : 'Failed to remove favorite'
                }));
            }
        },

        // Toggle favorite status by short_name
        async toggle(recipeShortName: string) {
            // Check if favorited by checking the current recipe list for this short_name
            const response = await fetch(`/api/rezepte/favorites/check/${recipeShortName}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const { isFavorite } = await response.json();
                if (isFavorite) {
                    await this.remove(recipeShortName);
                } else {
                    await this.add(recipeShortName);
                }
            }
        },

        // Check if a recipe is favorited by short_name
        async isFavoriteByShortName(shortName: string): Promise<boolean> {
            try {
                const response = await fetch(`/api/rezepte/favorites/check/${shortName}`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const { isFavorite } = await response.json();
                    return isFavorite;
                }
            } catch (error) {
                console.error('Error checking favorite status:', error);
            }
            return false;
        }
    };
}

export const favorites = createFavoritesStore();

// Helper function to add favorite status to recipes on client-side
export function addFavoriteStatusToRecipes(recipes: any[], userFavorites: string[]): any[] {
    return recipes.map(recipe => ({
        ...recipe,
        isFavorite: userFavorites.includes(recipe._id?.toString() || recipe.short_name)
    }));
}
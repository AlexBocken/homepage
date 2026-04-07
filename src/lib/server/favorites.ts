/**
 * Utility functions for handling user favorites on the server side
 */

import type { BriefRecipeType } from '$types/types';
import type { Session } from '@auth/sveltekit';

type BriefRecipeWithFavorite = BriefRecipeType & { isFavorite: boolean };

export async function getUserFavorites(fetch: typeof globalThis.fetch, locals: App.Locals, recipeLang = 'rezepte'): Promise<string[]> {
    const session = await locals.auth();

    if (!session?.user?.nickname) {
        return [];
    }

    try {
        const favRes = await fetch(`/api/${recipeLang}/favorites`);
        if (favRes.ok) {
            const favData = await favRes.json();
            return favData.favorites || [];
        }
    } catch (e) {
        // Silently fail if favorites can't be loaded
        console.error('Error loading user favorites:', e);
    }

    return [];
}

export function addFavoriteStatusToRecipes(recipes: BriefRecipeType[], userFavorites: string[]): BriefRecipeWithFavorite[] {
    // Safety check: ensure recipes is an array
    if (!Array.isArray(recipes)) {
        console.error('addFavoriteStatusToRecipes: recipes is not an array:', recipes);
        return [];
    }

    return recipes.map(recipe => ({
        ...recipe,
        isFavorite: userFavorites.some(favId => favId.toString() === recipe._id.toString())
    }));
}

export async function loadRecipesWithFavorites(
    fetch: typeof globalThis.fetch,
    locals: App.Locals,
    recipeLoader: () => Promise<BriefRecipeType[]>,
    recipeLang = 'rezepte'
): Promise<{ recipes: BriefRecipeWithFavorite[], session: Session | null }> {
    const [recipes, userFavorites, session] = await Promise.all([
        recipeLoader(),
        getUserFavorites(fetch, locals, recipeLang),
        locals.auth()
    ]);

    return {
        recipes: addFavoriteStatusToRecipes(recipes, userFavorites),
        session
    };
}

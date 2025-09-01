/**
 * Utility functions for handling user favorites on the server side
 */

export async function getUserFavorites(fetch: any, locals: any): Promise<string[]> {
    const session = await locals.auth();
    
    if (!session?.user?.nickname) {
        return [];
    }
    
    try {
        const favRes = await fetch('/api/rezepte/favorites');
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

export function addFavoriteStatusToRecipes(recipes: any[], userFavorites: string[]): any[] {
    return recipes.map(recipe => ({
        ...recipe,
        isFavorite: userFavorites.some(favId => favId.toString() === recipe._id.toString())
    }));
}

export async function loadRecipesWithFavorites(
    fetch: any, 
    locals: any, 
    recipeLoader: () => Promise<any>
): Promise<{ recipes: any[], session: any }> {
    const [recipes, userFavorites, session] = await Promise.all([
        recipeLoader(),
        getUserFavorites(fetch, locals),
        locals.auth()
    ]);
    
    return {
        recipes: addFavoriteStatusToRecipes(recipes, userFavorites),
        session
    };
}
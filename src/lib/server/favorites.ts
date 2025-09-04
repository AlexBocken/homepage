/**
 * Utility functions for handling user favorites on the server side
 */

export async function getUserFavorites(fetch: any, locals: any): Promise<string[]> {
    const session = await locals.auth();
    
    if (!session?.user?.nickname) {
        return [];
    }
    
    try {
        // Use absolute URL for internal server-side fetch to avoid nginx routing issues
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'http://localhost:3000' 
            : 'http://localhost:5173';
        
        console.log(`Fetching favorites from: ${baseUrl}/api/rezepte/favorites`);
        const favRes = await fetch(`${baseUrl}/api/rezepte/favorites`);
        
        if (favRes.ok) {
            const favData = await favRes.json();
            console.log(`Loaded ${favData.favorites?.length || 0} favorites for user ${session.user.nickname}`);
            return favData.favorites || [];
        } else {
            console.error(`Favorites fetch failed with status: ${favRes.status}`);
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
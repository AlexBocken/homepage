import type { PageServerLoad } from "./$types";
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, locals }) => {
    const session = await locals.auth();
    
    if (!session?.user?.nickname) {
        throw redirect(302, '/rezepte');
    }

    try {
        const res = await fetch('/api/rezepte/favorites/recipes');
        if (!res.ok) {
            return {
                favorites: [],
                error: 'Failed to load favorites'
            };
        }
        
        const favorites = await res.json();
        
        return {
            favorites,
            session
        };
    } catch (e) {
        return {
            favorites: [],
            error: 'Failed to load favorites'
        };
    }
};
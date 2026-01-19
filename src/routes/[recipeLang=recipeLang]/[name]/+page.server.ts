import { redirect, error } from '@sveltejs/kit';
import { stripHtmlTags } from '$lib/js/stripHtmlTags';

export async function load({ parent }) {
    // Get data from universal load function
    const data = await parent();

    // Strip HTML tags server-side to avoid bundling cheerio in client
    const strippedName = stripHtmlTags(data.name);
    const strippedDescription = stripHtmlTags(data.description);

    return {
        strippedName,
        strippedDescription,
    };
}

export const actions = {
    toggleFavorite: async ({ request, locals, url, fetch }) => {
        const session = await locals.auth();
        
        if (!session?.user?.nickname) {
            throw error(401, 'Authentication required');
        }
        
        const formData = await request.formData();
        const recipeId = formData.get('recipeId') as string;
        const isFavorite = formData.get('isFavorite') === 'true';
        
        if (!recipeId) {
            throw error(400, 'Recipe ID required');
        }
        
        try {
            // Use the existing API endpoint
            const method = isFavorite ? 'DELETE' : 'POST';
            const response = await fetch('/api/rezepte/favorites', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recipeId }),
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error('API error:', response.status, errorData);
                throw error(response.status, `Failed to toggle favorite: ${errorData}`);
            }
            
            // Redirect back to the same page to refresh the state
            throw redirect(303, url.pathname);
        } catch (e) {
            // If it's a redirect, let it through
            if (e && typeof e === 'object' && 'status' in e && e.status === 303) {
                throw e;
            }
            console.error('Favorite toggle error:', e);
            throw error(500, 'Failed to toggle favorite');
        }
    },
    
    swapYeast: async ({ request, url }) => {
        const formData = await request.formData();
        const yeastId = parseInt(formData.get('yeastId') as string);

        // Build new URL
        const newUrl = new URL(url.pathname, url.origin);
        
        // Restore all parameters from the form data (they were submitted as currentParam_*)
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('currentParam_')) {
                const paramName = key.substring('currentParam_'.length);
                newUrl.searchParams.set(paramName, value as string);
            }
        }
        
        // Toggle the yeast flag - if it exists, remove it; if not, add it
        const yeastParam = `y${yeastId}`;
        if (newUrl.searchParams.has(yeastParam)) {
            newUrl.searchParams.delete(yeastParam);
        } else {
            newUrl.searchParams.set(yeastParam, '1');
        }
        
        throw redirect(303, newUrl.toString());
    }
};
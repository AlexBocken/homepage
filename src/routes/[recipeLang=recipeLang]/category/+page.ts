import type { PageLoad } from "./$types";
import { loadWithOfflineFallback } from '$lib/offline/helpers';
import { getAllCategories } from '$lib/offline/db';

export const load: PageLoad = async ({ fetch, params }) => {
    return loadWithOfflineFallback({
        label: 'categories',
        offline: async () => ({ categories: await getAllCategories(), isOffline: true }),
        online: async () => {
            const res = await fetch(`/api/${params.recipeLang}/items/category`);
            const categories = await res.json();
            return { categories, isOffline: false };
        }
    });
};

import type { PageLoad } from "./$types";
import { loadWithOfflineFallback } from '$lib/offline/helpers';
import { getAllTags } from '$lib/offline/db';

export const load: PageLoad = async ({ fetch, params }) => {
    return loadWithOfflineFallback({
        label: 'tags',
        offline: async () => ({ tags: await getAllTags(), isOffline: true }),
        online: async () => {
            const res = await fetch(`/api/${params.recipeLang}/items/tag`);
            const tags = await res.json();
            return { tags, isOffline: false };
        }
    });
};

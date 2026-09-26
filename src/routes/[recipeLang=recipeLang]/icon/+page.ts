import type { PageLoad } from "./$types";
import { loadWithOfflineFallback } from '$lib/offline/helpers';
import { getAllIcons } from '$lib/offline/db';

export const load: PageLoad = async ({ fetch, params }) => {
    return loadWithOfflineFallback({
        label: 'icons',
        offline: async () => ({ icons: await getAllIcons(), isOffline: true }),
        online: async () => {
            const res = await fetch(`/api/${params.recipeLang}/items/icon`);
            const icons = await res.json();
            return { icons, isOffline: false };
        }
    });
};

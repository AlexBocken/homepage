import { overlayOfflineData } from '$lib/offline/helpers';
import { getBriefRecipesInSeasonOn } from '$lib/offline/db';
import { rand_array } from '$lib/js/randomize';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
    return overlayOfflineData(data, {
        label: 'season data',
        isEmpty: (d) => !d?.season?.length,
        offline: async () => ({ season: rand_array(await getBriefRecipesInSeasonOn(new Date())) })
    });
};

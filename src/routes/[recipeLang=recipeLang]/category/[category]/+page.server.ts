import type { PageServerLoad } from "./$types";
import { loadFacetListing } from "$lib/server/favorites";

export const load: PageServerLoad = async (event) => ({
    category: event.params.category,
    ...await loadFacetListing(event, `category/${event.params.category}`)
});

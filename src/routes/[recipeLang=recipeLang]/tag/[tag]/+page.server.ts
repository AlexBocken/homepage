import type { PageServerLoad } from "./$types";
import { loadFacetListing } from "$lib/server/favorites";

export const load: PageServerLoad = async (event) => ({
    tag: event.params.tag,
    ...await loadFacetListing(event, `tag/${event.params.tag}`)
});

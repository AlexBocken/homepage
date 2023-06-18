import type { PageLoad } from "./$types";

export async function load({ fetch }) {
    const res_tag = await fetch(`/api/tags`);
    const items_tag = await res_tag.json();
    return {
	    tags: item.tags
    }
};

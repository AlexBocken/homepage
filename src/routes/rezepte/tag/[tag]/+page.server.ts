import type { PageLoad } from "./$types";

export async function load({ fetch, params }) {
    const res_tag = await fetch(`/api/items/tag/${params.tag}`);
    const items_tag = await res_tag.json();
    return {
	    tag: params.tag,
	    recipes: items_tag
    }
};

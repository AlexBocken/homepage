import type { PageLoad } from "./$types";

export async function load({ fetch, params }) {
    const res = await fetch(`/api/items/category/${params.category}`);
    const items = await res.json();
    return {
	    category: params.category,
	    recipes: items
    }
};

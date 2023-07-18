import type { PageLoad } from "./$types";

export async function load({ fetch}) {
    const res = await fetch(`/api/items/category`);
    const categories= await res.json();
    return {categories}
};

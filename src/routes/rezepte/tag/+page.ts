import type { PageLoad } from "./$types";

export async function load({ fetch}) {
    const res = await fetch(`/api/items/tag`);
    const tags = await res.json();
    return {tags}
};

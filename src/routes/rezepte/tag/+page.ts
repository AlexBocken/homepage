import type { PageLoad } from "./$types";

export async function load({ fetch}) {
    const res = await fetch(`/api/rezepte/items/tag`);
    const tags = await res.json();
    return {tags}
};

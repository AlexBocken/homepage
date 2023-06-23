import type { PageLoad } from "./$types";

export async function load({ fetch, params}) {
    let current_month = new Date().getMonth() + 1
    const res = await fetch(`/api/items/${params.name}`);
    const recipe = await res.json();
    return {recipe};
};

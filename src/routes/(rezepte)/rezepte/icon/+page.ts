import type { PageLoad } from "./$types";

export async function load({ fetch }) {
    let current_month = new Date().getMonth() + 1
    const res_icons = await fetch(`/api/items/icon`);
    const item = await res_icons.json();
    return {
	    icons: item,
    };
};

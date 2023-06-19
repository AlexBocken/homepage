import type { PageLoad } from "./$types";

export async function load({ fetch }) {
    let current_month = new Date().getMonth() + 1
    const res_season = await fetch(`/api/items/in_season/` + current_month);
    const item_season = await res_season.json();
    return {
	    season: item_season,
    };
};

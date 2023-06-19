import type { PageLoad } from "./$types";

export async function load({ fetch }) {
    let current_month = new Date().getMonth() + 1
    const res_season = await fetch(`/api/items/in_season/` + current_month);
    const res_all_brief = await fetch(`/api/items/all_brief`);
    const item_season = await res_season.json();
    const item_all_brief = await res_all_brief.json();
    return {
	    season: item_season,
	    all_brief: item_all_brief,
    };
};

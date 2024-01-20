import type { PageLoad } from "./$types";

export async function load({ fetch, params }) {
    const res_season = await fetch(`/api/rezepte/items/in_season/` + params.month);
    const res_all_brief = await fetch(`/api/rezepte/items/all_brief`);
    const item_season = await res_season.json();
    const item_all_brief = await res_all_brief.json();
    return {
	    month: params.month,
	    season: item_season,
    };
};

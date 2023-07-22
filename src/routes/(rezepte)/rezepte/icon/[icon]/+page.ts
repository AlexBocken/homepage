import type { PageLoad } from "./$types";

export async function load({ fetch, params }) {
    const res_season = await fetch(`/api/rezepte/items/icon/` + params.icon);
    const res_icons = await fetch(`/api/rezepte/items/icon`);
    const icons = await res_icons.json();
    const item_season = await res_season.json();
    return {
	    icons: icons,
	    icon: params.icon,
	    season: item_season,
    };
};

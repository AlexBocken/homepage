import { error } from "@sveltejs/kit";

export async function load({ fetch, params}) {
    let balance_res = await fetch(`/api/cospend/balance`);
    if (!balance_res.ok) {
	throw error(balance_res.status, `Failed to fetch balance`);
    }
    let balance = await balance_res.json();
    const items_res = await fetch(`/api/cospend/page/1`);
    if (!items_res.ok) {
	throw error(items_res.status, `Failed to fetch items`);
    }
    let items = await items_res.json();
    return {
	    balance,
	    items
    };
}

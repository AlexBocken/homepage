import { error } from "@sveltejs/kit";

export async function load({ fetch, params}) {
    const res = await fetch(`/api/items/${params.name}`);
    let item = await res.json();
    if(!res.ok){
	    throw error(res.status, item.message)
    }
    return item;
}

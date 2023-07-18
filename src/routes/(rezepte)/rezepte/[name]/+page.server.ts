// import { error } from '@sveltejs/kit';
import type { PageLoad } from "./$types";
//import { Recipe } from '../../../models/Recipe';
//import { dbConnect, dbDisconnect } from '../../../utils/db';
import { error } from "@sveltejs/kit";

export async function load({ fetch, params, locals }) {
    const res = await fetch(`/api/items/${params.name}`);
    let item = await res.json();
    item.user = locals.user
    if(res.status != 200){
	    throw error(res.status, item.message)
    }
    return item;
};

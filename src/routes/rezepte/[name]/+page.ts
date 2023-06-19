// import { error } from '@sveltejs/kit';
import type { PageLoad } from "./$types";
//import { Recipe } from '../../../models/Recipe';
//import { dbConnect, dbDisconnect } from '../../../utils/db';

export async function load({ fetch, params }) {
    const res = await fetch(`/api/items/${params.name}`);
    const item = await res.json();

    return item;
};

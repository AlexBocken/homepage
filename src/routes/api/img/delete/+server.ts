import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { BEARER_TOKEN } from '$env/static/private'
import { IMAGE_DIR } from '$env/static/private'
import { unlink } from 'node:fs';
import { error } from '@sveltejs/kit';

export const POST =  (async ({ request })  => {
    const data = await request.json();
    if(data.bearer === BEARER_TOKEN){
	[ "full", "thumb", "placeholder"].forEach((folder) => {
		unlink(path.join(IMAGE_DIR, "rezepte", folder, data.name + ".webp"), (e) => {
			if(e) error(404, "could not delete: " + folder + "/" + data.name + ".webp" + e)
		})
	})
	return new Response(JSON.stringify({msg: "Deleted image successfully"}),{
			    status: 200,
  	});
    }
    else{
    	throw error(403, "Password incorrect")
    }

}) satisfies RequestHandler;

import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { BEARER_TOKEN } from '$env/static/private'
import { IMAGE_DIR } from '$env/static/private'
import { rename } from 'node:fs';
import { error } from '@sveltejs/kit';

export const POST =  (async ({ request })  => {
    const data = await request.json();
    if(data.bearer === BEARER_TOKEN){
	[ "full", "thumb", "placeholder"].forEach((folder) => {
		rename(path.join(IMAGE_DIR, folder, data.old_name + ".webp"), path.join(IMAGE_DIR, folder, data.new_name + ".webp"), (e) => {
		if(e) throw error(500, "could not mv: " + folder + "/" + data.old_name + ".webp")
		})
	});
	return new Response(JSON.stringify({msg: "Deleted image successfully"}),{
			    status: 200,
  			});
    }
    else{
    	throw error(403, "Password incorrect")
    }

}) satisfies RequestHandler;

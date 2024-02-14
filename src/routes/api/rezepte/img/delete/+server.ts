import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import { unlink } from 'node:fs';
import { error } from '@sveltejs/kit';

export const POST =  (async ({ request, locals})  => {
	const data = await request.json();
	const auth = await locals.auth()
    	if(!auth) throw error(401, "You need to be logged in")

	[ "full", "thumb", "placeholder"].forEach((folder) => {
		unlink(path.join(IMAGE_DIR, "rezepte", folder, data.name + ".webp"), (e) => {
			if(e) error(404, "could not delete: " + folder + "/" + data.name + ".webp" + e)
		})
	})
	return new Response(JSON.stringify({msg: "Deleted image successfully"}),{
			    status: 200,
  	});
}) satisfies RequestHandler;

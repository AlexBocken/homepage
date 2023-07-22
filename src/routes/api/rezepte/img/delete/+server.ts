import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import { unlink } from 'node:fs';
import { error } from '@sveltejs/kit';
import { authenticateUser } from '$lib/js/authenticate';;

export const POST =  (async ({ request, cookies })  => {
	const data = await request.json();
    	const user = await authenticateUser(cookies)
    	if(!user) throw error(401, "You need to be logged in")
    	if(!user.access.includes("rezepte")) throw error(401, "Your don't have the required permission for this")
	[ "full", "thumb", "placeholder"].forEach((folder) => {
		unlink(path.join(IMAGE_DIR, "rezepte", folder, data.name + ".webp"), (e) => {
			if(e) error(404, "could not delete: " + folder + "/" + data.name + ".webp" + e)
		})
	})
	return new Response(JSON.stringify({msg: "Deleted image successfully"}),{
			    status: 200,
  	});
}) satisfies RequestHandler;

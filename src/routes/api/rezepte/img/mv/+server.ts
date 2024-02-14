import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import { rename } from 'node:fs';
import { error } from '@sveltejs/kit';

export const POST =  (async ({ request, locals})  => {
	const data = await request.json();
	const auth = await locals.auth();
	if(!auth ) throw error(401, "need to be logged in")

	[ "full", "thumb", "placeholder"].forEach((folder) => {
		const old_path = path.join(IMAGE_DIR, "rezepte", folder, data.old_name + ".webp")
		rename(old_path, path.join(IMAGE_DIR, "rezepte", folder, data.new_name + ".webp"), (e) => {
		console.log(e)
		if(e) throw error(500, "could not mv: " + old_path)
		})
	});

	return new Response(JSON.stringify({msg: "Deleted image successfully"}),{
			    status: 200,
  			});
}) satisfies RequestHandler;

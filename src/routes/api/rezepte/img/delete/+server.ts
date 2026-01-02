import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import { unlink } from 'node:fs';
import { error } from '@sveltejs/kit';

export const POST =  (async ({ request, locals})  => {
	const data = await request.json();
	const auth = await locals.auth()
    	if(!auth) throw error(401, "You need to be logged in")

	// data.filename should be the full filename with hash (e.g., "maccaroni.a1b2c3d4.webp")
	// For backward compatibility, also support data.name (will construct filename)
	const hashedFilename = data.filename || (data.name + ".webp");

	// Also extract basename to delete unhashed version
	const basename = data.name || hashedFilename.replace(/\.[a-f0-9]{8}\.webp$/, '').replace(/\.webp$/, '');
	const unhashedFilename = basename + '.webp';

	[ "full", "thumb", "placeholder"].forEach((folder) => {
		// Delete hashed version
		unlink(path.join(IMAGE_DIR, "rezepte", folder, hashedFilename), (e) => {
			if(e) console.warn(`Could not delete hashed: ${folder}/${hashedFilename}`, e);
		});

		// Delete unhashed version (for graceful degradation)
		unlink(path.join(IMAGE_DIR, "rezepte", folder, unhashedFilename), (e) => {
			if(e) console.warn(`Could not delete unhashed: ${folder}/${unhashedFilename}`, e);
		});
	})
	return new Response(JSON.stringify({msg: "Deleted image successfully"}),{
			    status: 200,
  	});
}) satisfies RequestHandler;

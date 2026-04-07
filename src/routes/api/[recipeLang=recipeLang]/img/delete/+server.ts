import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import { unlink } from 'node:fs';
import { error } from '@sveltejs/kit';
import { requireGroup } from '$lib/server/middleware/auth';

/** Ensure a resolved path stays within the allowed base directory */
function assertWithinDir(base: string, resolved: string) {
	if (!resolved.startsWith(path.resolve(base) + path.sep)) {
		throw error(400, 'Invalid filename');
	}
}

export const POST =  (async ({ request, locals})  => {
	await requireGroup(locals, 'rezepte_users');
	const data = await request.json();

	const hashedFilename = data.filename || (data.name + ".webp");
	const basename = data.name || hashedFilename.replace(/\.[a-f0-9]{8}\.webp$/, '').replace(/\.webp$/, '');
	const unhashedFilename = basename + '.webp';

	const recipeImgDir = path.join(IMAGE_DIR, "rezepte");

	[ "full", "thumb"].forEach((folder) => {
		const hashedPath = path.resolve(recipeImgDir, folder, hashedFilename);
		const unhashedPath = path.resolve(recipeImgDir, folder, unhashedFilename);
		assertWithinDir(recipeImgDir, hashedPath);
		assertWithinDir(recipeImgDir, unhashedPath);

		unlink(hashedPath, (e) => {
			if(e) console.warn(`Could not delete hashed: ${folder}/${hashedFilename}`, e);
		});
		unlink(unhashedPath, (e) => {
			if(e) console.warn(`Could not delete unhashed: ${folder}/${unhashedFilename}`, e);
		});
	})
	return new Response(JSON.stringify({msg: "Deleted image successfully"}),{
			    status: 200,
  	});
}) satisfies RequestHandler;

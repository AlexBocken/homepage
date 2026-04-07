import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import { rename } from 'node:fs';
import { error } from '@sveltejs/kit';
import { extractBasename, getHashedFilename } from '$utils/imageHash';
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

	const oldFilename = data.old_filename || (data.old_name + ".webp");
	const hashMatch = oldFilename.match(/\.([a-f0-9]{8})\.webp$/);

	let newFilename: string;
	if (hashMatch) {
		const hash = hashMatch[1];
		newFilename = getHashedFilename(data.new_name, hash);
	} else {
		newFilename = data.new_name + ".webp";
	}

	const recipeImgDir = path.join(IMAGE_DIR, "rezepte");

	[ "full", "thumb"].forEach((folder) => {
		const oldPath = path.resolve(recipeImgDir, folder, oldFilename);
		const newPath = path.resolve(recipeImgDir, folder, newFilename);
		assertWithinDir(recipeImgDir, oldPath);
		assertWithinDir(recipeImgDir, newPath);

		rename(oldPath, newPath, (e) => {
		if(e) console.warn(`could not mv: ${oldPath}`, e)
		})
	});

	return new Response(JSON.stringify({
		msg: "Renamed image successfully",
		filename: newFilename
	}),{
		status: 200,
	});
}) satisfies RequestHandler;

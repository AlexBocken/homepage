import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import { rename } from 'node:fs';
import { error } from '@sveltejs/kit';
import { extractBasename, getHashedFilename } from '$utils/imageHash';

export const POST =  (async ({ request, locals})  => {
	const data = await request.json();
	const auth = await locals.auth();
	if(!auth ) throw error(401, "need to be logged in")

	// data.old_filename should be the full filename with hash (e.g., "maccaroni.a1b2c3d4.webp")
	// data.new_name should be the new basename (e.g., "pasta")
	// Extract hash from old filename and apply to new basename
	const oldFilename = data.old_filename || (data.old_name + ".webp");
	const hashMatch = oldFilename.match(/\.([a-f0-9]{8})\.webp$/);

	let newFilename: string;
	if (hashMatch) {
		// Old filename has hash, preserve it
		const hash = hashMatch[1];
		newFilename = getHashedFilename(data.new_name, hash);
	} else {
		// Old filename has no hash (legacy), new one won't either
		newFilename = data.new_name + ".webp";
	}

	[ "full", "thumb"].forEach((folder) => {
		const old_path = path.join(IMAGE_DIR, "rezepte", folder, oldFilename)
		rename(old_path, path.join(IMAGE_DIR, "rezepte", folder, newFilename), (e) => {
		console.log(e)
		if(e) throw error(500, "could not mv: " + old_path)
		})
	});

	return new Response(JSON.stringify({
		msg: "Renamed image successfully",
		filename: newFilename
	}),{
		status: 200,
	});
}) satisfies RequestHandler;

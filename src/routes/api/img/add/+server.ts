import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import sharp from 'sharp';
import { authenticateUser } from '$lib/js/authenticate';

export const POST =  (async ({ request, cookies })  => {
	const data = await request.json();
    	const user = await authenticateUser(cookies)
	if (!user) throw error(401, "Need to be logged in")
	if (!user.access.includes("rezepte")) throw error(401, "You don't have sufficient permissions for this")
	let full_res = new Buffer.from(data.image, 'base64')
	// reduce image size if over 500KB
	const MAX_SIZE_KB = 500
	//const metadata = await sharp(full_res).metadata()
	////reduce image size if larger than 500KB
	//if(metadata.size > MAX_SIZE_KB*1000){
	//	full_res = sharp(full_res).
	//		webp( { quality: 70})
	//		.toBuffer()
	//}
	await sharp(full_res)
		.toFormat('webp')
		.toFile(path.join(IMAGE_DIR,
				  "rezepte",
				  "full",
				  data.name + ".webp"))
	await sharp(full_res)
		.resize({ width: 800})
		.toFormat('webp')
		.toFile(path.join(IMAGE_DIR,
			  "rezepte",
			  "thumb",
			  data.name + ".webp"))
	await sharp(full_res)
		.resize({ width: 20})
		.toFormat('webp')
		.toFile(path.join(IMAGE_DIR,
		          "rezepte",
			  "placeholder",
			  data.name + ".webp"))
	return new Response(JSON.stringify({msg: "Added image successfully"}),{
			    status: 200,
  	});
}) satisfies RequestHandler;

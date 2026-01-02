import path from 'path'
import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private'
import sharp from 'sharp';
import { generateImageHashFromBuffer, getHashedFilename } from '$utils/imageHash';

export const POST =  (async ({ request, locals})  => {
	const data = await request.json();
	const auth = await locals.auth();
	if (!auth) throw error(401, "Need to be logged in")
	let full_res = new Buffer.from(data.image, 'base64')

	// Generate content hash for cache busting
	const imageHash = generateImageHashFromBuffer(full_res);
	const hashedFilename = getHashedFilename(data.name, imageHash);
	const unhashedFilename = data.name + '.webp';

	// reduce image size if over 500KB
	const MAX_SIZE_KB = 500
	//const metadata = await sharp(full_res).metadata()
	////reduce image size if larger than 500KB
	//if(metadata.size > MAX_SIZE_KB*1000){
	//	full_res = sharp(full_res).
	//		webp( { quality: 70})
	//		.toBuffer()
	//}

	// Save full size - both hashed and unhashed versions
	const fullBuffer = await sharp(full_res)
		.toFormat('webp')
		.toBuffer();

	await sharp(fullBuffer)
		.toFile(path.join(IMAGE_DIR, "rezepte", "full", hashedFilename));
	await sharp(fullBuffer)
		.toFile(path.join(IMAGE_DIR, "rezepte", "full", unhashedFilename));

	// Save thumbnail - both hashed and unhashed versions
	const thumbBuffer = await sharp(full_res)
		.resize({ width: 800})
		.toFormat('webp')
		.toBuffer();

	await sharp(thumbBuffer)
		.toFile(path.join(IMAGE_DIR, "rezepte", "thumb", hashedFilename));
	await sharp(thumbBuffer)
		.toFile(path.join(IMAGE_DIR, "rezepte", "thumb", unhashedFilename));

	// Save placeholder - both hashed and unhashed versions
	const placeholderBuffer = await sharp(full_res)
		.resize({ width: 20})
		.toFormat('webp')
		.toBuffer();

	await sharp(placeholderBuffer)
		.toFile(path.join(IMAGE_DIR, "rezepte", "placeholder", hashedFilename));
	await sharp(placeholderBuffer)
		.toFile(path.join(IMAGE_DIR, "rezepte", "placeholder", unhashedFilename))
	return new Response(JSON.stringify({
		msg: "Added image successfully",
		filename: hashedFilename
	}),{
		status: 200,
  	});
}) satisfies RequestHandler;

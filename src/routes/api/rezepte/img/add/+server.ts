import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private';
import sharp from 'sharp';
import { generateImageHashFromBuffer, getHashedFilename } from '$utils/imageHash';
import { validateImageFile } from '$utils/imageValidation';

/**
 * Secure image upload endpoint for recipe images
 *
 * SECURITY:
 * - Requires authentication
 * - 5-layer validation (size, magic bytes, MIME, extension, Sharp)
 * - Uses FormData instead of base64 JSON (more efficient, more secure)
 * - Generates full/thumb/placeholder versions
 * - Content hash for cache busting
 *
 * @route POST /api/rezepte/img/add
 */
export const POST = (async ({ request, locals }) => {
	// Check authentication
	const auth = await locals.auth();
	if (!auth) {
		throw error(401, 'Authentication required to upload images');
	}

	try {
		const formData = await request.formData();

		// Extract image file and filename
		const image = formData.get('image') as File;
		const name = formData.get('name')?.toString().trim();

		if (!image) {
			throw error(400, 'No image file provided');
		}

		if (!name) {
			throw error(400, 'Image name is required');
		}

		// Comprehensive security validation
		const validationResult = await validateImageFile(image);
		if (!validationResult.valid) {
			throw error(400, validationResult.error || 'Invalid image file');
		}

		// Convert File to Buffer for processing
		const arrayBuffer = await image.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Generate content hash for cache busting
		const imageHash = generateImageHashFromBuffer(buffer);
		const hashedFilename = getHashedFilename(name, imageHash);
		const unhashedFilename = name + '.webp';

		// Process image with Sharp - convert to WebP format
		// Save full size - both hashed and unhashed versions
		const fullBuffer = await sharp(buffer)
			.toFormat('webp')
			.webp({ quality: 90 }) // High quality for full size
			.toBuffer();

		await sharp(fullBuffer).toFile(
			path.join(IMAGE_DIR, 'rezepte', 'full', hashedFilename)
		);
		await sharp(fullBuffer).toFile(
			path.join(IMAGE_DIR, 'rezepte', 'full', unhashedFilename)
		);

		// Save thumbnail (800px width) - both hashed and unhashed versions
		const thumbBuffer = await sharp(buffer)
			.resize({ width: 800 })
			.toFormat('webp')
			.webp({ quality: 85 })
			.toBuffer();

		await sharp(thumbBuffer).toFile(
			path.join(IMAGE_DIR, 'rezepte', 'thumb', hashedFilename)
		);
		await sharp(thumbBuffer).toFile(
			path.join(IMAGE_DIR, 'rezepte', 'thumb', unhashedFilename)
		);

		// Save placeholder (20px width) - both hashed and unhashed versions
		const placeholderBuffer = await sharp(buffer)
			.resize({ width: 20 })
			.toFormat('webp')
			.webp({ quality: 60 })
			.toBuffer();

		await sharp(placeholderBuffer).toFile(
			path.join(IMAGE_DIR, 'rezepte', 'placeholder', hashedFilename)
		);
		await sharp(placeholderBuffer).toFile(
			path.join(IMAGE_DIR, 'rezepte', 'placeholder', unhashedFilename)
		);

		return json({
			success: true,
			msg: 'Image uploaded successfully',
			filename: hashedFilename,
			unhashedFilename: unhashedFilename
		});
	} catch (err: any) {
		// Re-throw errors that already have status codes
		if (err.status) throw err;

		// Log and throw generic error for unexpected failures
		console.error('Image upload error:', err);
		throw error(500, `Failed to upload image: ${err.message || 'Unknown error'}`);
	}
}) satisfies RequestHandler;

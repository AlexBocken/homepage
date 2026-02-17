import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private';
import sharp from 'sharp';
import { generateImageHashFromBuffer, getHashedFilename } from '$utils/imageHash';
import { validateImageFile } from '$utils/imageValidation';
import { extractDominantColor } from '$utils/imageProcessing';

/**
 * Secure image upload endpoint for recipe images
 *
 * SECURITY:
 * - Requires authentication
 * - 5-layer validation (size, magic bytes, MIME, extension, Sharp)
 * - Uses FormData instead of base64 JSON (more efficient, more secure)
 * - Generates full/thumb versions + dominant color extraction
 * - Content hash for cache busting
 *
 * @route POST /api/rezepte/img/add
 */
export const POST = (async ({ request, locals }) => {
	console.log('[API:ImgAdd] Image upload request received');

	// Check authentication
	const auth = await locals.auth();
	if (!auth) {
		console.error('[API:ImgAdd] Authentication required');
		throw error(401, 'Authentication required to upload images');
	}
	console.log('[API:ImgAdd] Authentication passed');

	try {
		const formData = await request.formData();

		// Extract image file and filename
		const image = formData.get('image') as File;
		const name = formData.get('name')?.toString().trim();

		console.log('[API:ImgAdd] Form data:', {
			hasImage: !!image,
			imageSize: image?.size,
			imageName: image?.name,
			imageType: image?.type,
			recipeName: name
		});

		if (!image) {
			console.error('[API:ImgAdd] No image file provided');
			throw error(400, 'No image file provided');
		}

		if (!name) {
			console.error('[API:ImgAdd] Image name is required');
			throw error(400, 'Image name is required');
		}

		// Comprehensive security validation
		console.log('[API:ImgAdd] Starting validation...');
		const validationResult = await validateImageFile(image);
		if (!validationResult.valid) {
			console.error('[API:ImgAdd] Validation failed:', validationResult.error);
			throw error(400, validationResult.error || 'Invalid image file');
		}
		console.log('[API:ImgAdd] Validation passed');

		// Convert File to Buffer for processing
		const arrayBuffer = await image.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		console.log('[API:ImgAdd] Buffer created, size:', buffer.length, 'bytes');

		// Generate content hash for cache busting
		const imageHash = generateImageHashFromBuffer(buffer);
		const hashedFilename = getHashedFilename(name, imageHash);
		const unhashedFilename = name + '.webp';
		console.log('[API:ImgAdd] Generated filenames:', {
			hashed: hashedFilename,
			unhashed: unhashedFilename
		});

		// Process image with Sharp - convert to WebP format
		// Save full size - both hashed and unhashed versions
		console.log('[API:ImgAdd] Processing full size image...');
		const fullBuffer = await sharp(buffer)
			.toFormat('webp')
			.webp({ quality: 90 }) // High quality for full size
			.toBuffer();
		console.log('[API:ImgAdd] Full size buffer created, size:', fullBuffer.length, 'bytes');

		const fullHashedPath = path.join(IMAGE_DIR, 'rezepte', 'full', hashedFilename);
		const fullUnhashedPath = path.join(IMAGE_DIR, 'rezepte', 'full', unhashedFilename);
		console.log('[API:ImgAdd] Saving full size to:', { fullHashedPath, fullUnhashedPath });

		await sharp(fullBuffer).toFile(fullHashedPath);
		await sharp(fullBuffer).toFile(fullUnhashedPath);
		console.log('[API:ImgAdd] Full size images saved ✓');

		// Save thumbnail (800px width) - both hashed and unhashed versions
		console.log('[API:ImgAdd] Processing thumbnail...');
		const thumbBuffer = await sharp(buffer)
			.resize({ width: 800 })
			.toFormat('webp')
			.webp({ quality: 85 })
			.toBuffer();
		console.log('[API:ImgAdd] Thumbnail buffer created, size:', thumbBuffer.length, 'bytes');

		const thumbHashedPath = path.join(IMAGE_DIR, 'rezepte', 'thumb', hashedFilename);
		const thumbUnhashedPath = path.join(IMAGE_DIR, 'rezepte', 'thumb', unhashedFilename);
		console.log('[API:ImgAdd] Saving thumbnail to:', { thumbHashedPath, thumbUnhashedPath });

		await sharp(thumbBuffer).toFile(thumbHashedPath);
		await sharp(thumbBuffer).toFile(thumbUnhashedPath);
		console.log('[API:ImgAdd] Thumbnail images saved');

		// Extract dominant color
		console.log('[API:ImgAdd] Extracting dominant color...');
		const color = await extractDominantColor(buffer);
		console.log('[API:ImgAdd] Dominant color:', color);

		console.log('[API:ImgAdd] Upload completed successfully');
		return json({
			success: true,
			msg: 'Image uploaded successfully',
			filename: hashedFilename,
			unhashedFilename: unhashedFilename,
			color
		});
	} catch (err: any) {
		// Re-throw errors that already have status codes
		if (err.status) throw err;

		// Log and throw generic error for unexpected failures
		console.error('[API:ImgAdd] Upload error:', err);
		throw error(500, `Failed to upload image: ${err.message || 'Unknown error'}`);
	}
}) satisfies RequestHandler;

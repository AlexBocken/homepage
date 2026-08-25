import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import sharp from 'sharp';
import { generateImageHashFromBuffer, getHashedFilename } from '$utils/imageHash';
import { validateImageFile } from '$utils/imageValidation';
import { blurPlaceholder } from '$lib/server/lqip';

/**
 * Process and save recipe image with multiple versions (full, thumb)
 * and build its blurred placeholder.
 * @param file - The image File object
 * @param name - The base name for the image (usually recipe short_name)
 * @param imageDir - The base directory where images are stored
 * @returns Object with hashedFilename, unhashedFilename, and blur placeholder
 */
export async function processAndSaveRecipeImage(
	file: File,
	name: string,
	imageDir: string
): Promise<{ filename: string; unhashedFilename: string; blur: string }> {
	console.log('[ImageProcessing] Starting image processing for:', {
		fileName: file.name,
		recipeName: name,
		imageDir: imageDir
	});

	// Comprehensive security validation
	const validationResult = await validateImageFile(file);
	if (!validationResult.valid) {
		console.error('[ImageProcessing] Validation failed:', validationResult.error);
		throw new Error(validationResult.error || 'Invalid image file');
	}
	console.log('[ImageProcessing] Validation succeeded');

	// Convert File to Buffer for processing
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	console.log('[ImageProcessing] Buffer created, size:', buffer.length, 'bytes');

	// Generate content hash for cache busting
	const imageHash = generateImageHashFromBuffer(buffer);
	const hashedFilename = getHashedFilename(name, imageHash);
	const unhashedFilename = name + '.webp';
	console.log('[ImageProcessing] Generated filenames:', {
		hashed: hashedFilename,
		unhashed: unhashedFilename
	});

	// Full size: the client photo editor already crops, scales and encodes WebP at
	// the user's chosen quality. Store that byte-for-byte so the on-disk file matches
	// the size the user saw in the editor — re-encoding through sharp would silently
	// re-compress and discard their quality/size choice.
	// Fallback (non-webp upload, e.g. editor bypassed): re-encode to WebP q90 as before.
	const fullDir = path.join(imageDir, 'rezepte', 'full');
	const thumbDir = path.join(imageDir, 'rezepte', 'thumb');
	// fs.writeFile (unlike sharp's toFile) does not create parent dirs, so ensure
	// both target directories exist before writing.
	await mkdir(fullDir, { recursive: true });
	await mkdir(thumbDir, { recursive: true });

	const fullHashedPath = path.join(fullDir, hashedFilename);
	const fullUnhashedPath = path.join(fullDir, unhashedFilename);

	let fullBuffer: Buffer;
	if (file.type === 'image/webp') {
		console.log('[ImageProcessing] Client WebP detected — storing full size as-is (passthrough)');
		fullBuffer = buffer;
	} else {
		console.log('[ImageProcessing] Non-WebP upload — re-encoding full size to WebP q90...');
		fullBuffer = await sharp(buffer).toFormat('webp').webp({ quality: 90 }).toBuffer();
	}
	console.log('[ImageProcessing] Full size buffer ready, size:', fullBuffer.length, 'bytes');
	console.log('[ImageProcessing] Saving full size to:', { fullHashedPath, fullUnhashedPath });

	await writeFile(fullHashedPath, fullBuffer);
	await writeFile(fullUnhashedPath, fullBuffer);
	console.log('[ImageProcessing] Full size images saved');

	// Save thumbnail (800px width) - both hashed and unhashed versions
	console.log('[ImageProcessing] Generating thumbnail (800px)...');
	const thumbBuffer = await sharp(buffer)
		.resize({ width: 800 })
		.toFormat('webp')
		.webp({ quality: 85 })
		.toBuffer();
	console.log('[ImageProcessing] Thumbnail buffer created, size:', thumbBuffer.length, 'bytes');

	const thumbHashedPath = path.join(thumbDir, hashedFilename);
	const thumbUnhashedPath = path.join(thumbDir, unhashedFilename);
	console.log('[ImageProcessing] Saving thumbnail to:', { thumbHashedPath, thumbUnhashedPath });

	await sharp(thumbBuffer).toFile(thumbHashedPath);
	await sharp(thumbBuffer).toFile(thumbUnhashedPath);
	console.log('[ImageProcessing] Thumbnail images saved');

	// Blurred placeholder, shown until the real image decodes.
	console.log('[ImageProcessing] Building blur placeholder...');
	const blur = await blurPlaceholder(buffer);
	console.log('[ImageProcessing] Blur placeholder:', blur ? blur.length + ' chars' : 'unavailable');

	console.log('[ImageProcessing] All image versions processed and saved successfully');
	return {
		filename: hashedFilename,
		unhashedFilename: unhashedFilename,
		blur: blur ?? ''
	};
}

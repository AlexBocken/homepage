import path from 'path';
import sharp from 'sharp';
import { generateImageHashFromBuffer, getHashedFilename } from '$utils/imageHash';
import { validateImageFile } from '$utils/imageValidation';

/**
 * Process and save recipe image with multiple versions (full, thumb, placeholder)
 * @param file - The image File object
 * @param name - The base name for the image (usually recipe short_name)
 * @param imageDir - The base directory where images are stored
 * @returns Object with hashedFilename and unhashedFilename
 */
export async function processAndSaveRecipeImage(
	file: File,
	name: string,
	imageDir: string
): Promise<{ filename: string; unhashedFilename: string }> {
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

	// Process image with Sharp - convert to WebP format
	// Save full size - both hashed and unhashed versions
	console.log('[ImageProcessing] Converting to WebP and generating full size...');
	const fullBuffer = await sharp(buffer)
		.toFormat('webp')
		.webp({ quality: 90 }) // High quality for full size
		.toBuffer();
	console.log('[ImageProcessing] Full size buffer created, size:', fullBuffer.length, 'bytes');

	const fullHashedPath = path.join(imageDir, 'rezepte', 'full', hashedFilename);
	const fullUnhashedPath = path.join(imageDir, 'rezepte', 'full', unhashedFilename);
	console.log('[ImageProcessing] Saving full size to:', { fullHashedPath, fullUnhashedPath });

	await sharp(fullBuffer).toFile(fullHashedPath);
	await sharp(fullBuffer).toFile(fullUnhashedPath);
	console.log('[ImageProcessing] Full size images saved ✓');

	// Save thumbnail (800px width) - both hashed and unhashed versions
	console.log('[ImageProcessing] Generating thumbnail (800px)...');
	const thumbBuffer = await sharp(buffer)
		.resize({ width: 800 })
		.toFormat('webp')
		.webp({ quality: 85 })
		.toBuffer();
	console.log('[ImageProcessing] Thumbnail buffer created, size:', thumbBuffer.length, 'bytes');

	const thumbHashedPath = path.join(imageDir, 'rezepte', 'thumb', hashedFilename);
	const thumbUnhashedPath = path.join(imageDir, 'rezepte', 'thumb', unhashedFilename);
	console.log('[ImageProcessing] Saving thumbnail to:', { thumbHashedPath, thumbUnhashedPath });

	await sharp(thumbBuffer).toFile(thumbHashedPath);
	await sharp(thumbBuffer).toFile(thumbUnhashedPath);
	console.log('[ImageProcessing] Thumbnail images saved ✓');

	// Save placeholder (20px width) - both hashed and unhashed versions
	console.log('[ImageProcessing] Generating placeholder (20px)...');
	const placeholderBuffer = await sharp(buffer)
		.resize({ width: 20 })
		.toFormat('webp')
		.webp({ quality: 60 })
		.toBuffer();
	console.log('[ImageProcessing] Placeholder buffer created, size:', placeholderBuffer.length, 'bytes');

	const placeholderHashedPath = path.join(imageDir, 'rezepte', 'placeholder', hashedFilename);
	const placeholderUnhashedPath = path.join(imageDir, 'rezepte', 'placeholder', unhashedFilename);
	console.log('[ImageProcessing] Saving placeholder to:', { placeholderHashedPath, placeholderUnhashedPath });

	await sharp(placeholderBuffer).toFile(placeholderHashedPath);
	await sharp(placeholderBuffer).toFile(placeholderUnhashedPath);
	console.log('[ImageProcessing] Placeholder images saved ✓');

	console.log('[ImageProcessing] All image versions processed and saved successfully ✓');
	return {
		filename: hashedFilename,
		unhashedFilename: unhashedFilename
	};
}

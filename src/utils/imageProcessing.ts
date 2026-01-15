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
	// Comprehensive security validation
	const validationResult = await validateImageFile(file);
	if (!validationResult.valid) {
		throw new Error(validationResult.error || 'Invalid image file');
	}

	// Convert File to Buffer for processing
	const arrayBuffer = await file.arrayBuffer();
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
		path.join(imageDir, 'rezepte', 'full', hashedFilename)
	);
	await sharp(fullBuffer).toFile(
		path.join(imageDir, 'rezepte', 'full', unhashedFilename)
	);

	// Save thumbnail (800px width) - both hashed and unhashed versions
	const thumbBuffer = await sharp(buffer)
		.resize({ width: 800 })
		.toFormat('webp')
		.webp({ quality: 85 })
		.toBuffer();

	await sharp(thumbBuffer).toFile(
		path.join(imageDir, 'rezepte', 'thumb', hashedFilename)
	);
	await sharp(thumbBuffer).toFile(
		path.join(imageDir, 'rezepte', 'thumb', unhashedFilename)
	);

	// Save placeholder (20px width) - both hashed and unhashed versions
	const placeholderBuffer = await sharp(buffer)
		.resize({ width: 20 })
		.toFormat('webp')
		.webp({ quality: 60 })
		.toBuffer();

	await sharp(placeholderBuffer).toFile(
		path.join(imageDir, 'rezepte', 'placeholder', hashedFilename)
	);
	await sharp(placeholderBuffer).toFile(
		path.join(imageDir, 'rezepte', 'placeholder', unhashedFilename)
	);

	return {
		filename: hashedFilename,
		unhashedFilename: unhashedFilename
	};
}

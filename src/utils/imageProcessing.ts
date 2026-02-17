import path from 'path';
import sharp from 'sharp';
import { generateImageHashFromBuffer, getHashedFilename } from '$utils/imageHash';
import { validateImageFile } from '$utils/imageValidation';

// --- sRGB <-> linear RGB <-> OKLAB color conversions ---

function srgbToLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
	return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
	const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
	const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
	const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
	const l = Math.cbrt(l_);
	const m = Math.cbrt(m_);
	const s = Math.cbrt(s_);
	return [
		0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
	];
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
	const l = L + 0.3963377774 * a + 0.2158037573 * b;
	const m = L - 0.1055613458 * a - 0.0638541728 * b;
	const s = L - 0.0894841775 * a - 1.2914855480 * b;
	const l3 = l * l * l;
	const m3 = m * m * m;
	const s3 = s * s * s;
	return [
		+4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
		-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
		-0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
	];
}

/**
 * Extract the perceptually dominant color from an image buffer.
 * Averages pixels in OKLAB space with a 2D Gaussian kernel biased toward the center.
 * Returns a hex string like "#a1b2c3".
 */
export async function extractDominantColor(input: Buffer | string): Promise<string> {
	const { data, info } = await sharp(input)
		.resize(50, 50, { fit: 'cover' })
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const { width, height } = info;
	const cx = (width - 1) / 2;
	const cy = (height - 1) / 2;
	const sigmaX = 0.15 * width;
	const sigmaY = 0.15 * height;

	let wL = 0, wa = 0, wb = 0, wSum = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 3;
			// Gaussian weight based on distance from center
			const dx = x - cx;
			const dy = y - cy;
			const w = Math.exp(-0.5 * ((dx * dx) / (sigmaX * sigmaX) + (dy * dy) / (sigmaY * sigmaY)));

			// sRGB [0-255] -> linear [0-1] -> OKLAB
			const lr = srgbToLinear(data[i] / 255);
			const lg = srgbToLinear(data[i + 1] / 255);
			const lb = srgbToLinear(data[i + 2] / 255);
			const [L, a, b] = linearRgbToOklab(lr, lg, lb);

			wL += w * L;
			wa += w * a;
			wb += w * b;
			wSum += w;
		}
	}

	// Average in OKLAB, convert back to sRGB
	const [rLin, gLin, bLin] = oklabToLinearRgb(wL / wSum, wa / wSum, wb / wSum);
	const r = Math.round(Math.min(1, Math.max(0, linearToSrgb(rLin))) * 255);
	const g = Math.round(Math.min(1, Math.max(0, linearToSrgb(gLin))) * 255);
	const b = Math.round(Math.min(1, Math.max(0, linearToSrgb(bLin))) * 255);

	return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * Process and save recipe image with multiple versions (full, thumb)
 * and extract dominant color.
 * @param file - The image File object
 * @param name - The base name for the image (usually recipe short_name)
 * @param imageDir - The base directory where images are stored
 * @returns Object with hashedFilename, unhashedFilename, and dominant color
 */
export async function processAndSaveRecipeImage(
	file: File,
	name: string,
	imageDir: string
): Promise<{ filename: string; unhashedFilename: string; color: string }> {
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
	console.log('[ImageProcessing] Full size images saved');

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
	console.log('[ImageProcessing] Thumbnail images saved');

	// Extract dominant color
	console.log('[ImageProcessing] Extracting dominant color...');
	const color = await extractDominantColor(buffer);
	console.log('[ImageProcessing] Dominant color:', color);

	console.log('[ImageProcessing] All image versions processed and saved successfully');
	return {
		filename: hashedFilename,
		unhashedFilename: unhashedFilename,
		color
	};
}

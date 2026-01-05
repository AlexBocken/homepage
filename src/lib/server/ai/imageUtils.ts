import sharp from 'sharp';
import { readFile } from 'fs/promises';

export interface ResizeOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	format?: 'jpeg' | 'webp' | 'png';
}

/**
 * Resize and optimize image for vision model processing
 * @param imagePath - Path to the image file
 * @param options - Resize options
 * @returns Base64 encoded optimized image
 */
export async function resizeAndEncodeImage(
	imagePath: string,
	options: ResizeOptions = {}
): Promise<string> {
	const {
		maxWidth = 1024,
		maxHeight = 1024,
		quality = 85,
		format = 'jpeg',
	} = options;

	try {
		// Read and process image with sharp
		const processedImage = await sharp(imagePath)
			.resize(maxWidth, maxHeight, {
				fit: 'inside', // Maintain aspect ratio
				withoutEnlargement: true, // Don't upscale smaller images
			})
			.toFormat(format, { quality })
			.toBuffer();

		return processedImage.toString('base64');
	} catch (error) {
		console.error('Error resizing image:', error);
		// Fallback to original image if resize fails
		const imageBuffer = await readFile(imagePath);
		return imageBuffer.toString('base64');
	}
}

/**
 * Get image dimensions without loading full image into memory
 */
export async function getImageDimensions(
	imagePath: string
): Promise<{ width: number; height: number }> {
	const metadata = await sharp(imagePath).metadata();
	return {
		width: metadata.width || 0,
		height: metadata.height || 0,
	};
}

/**
 * Estimate optimal resize dimensions for vision models
 * Balance between quality and performance
 */
export function calculateOptimalDimensions(
	originalWidth: number,
	originalHeight: number,
	targetSize: number = 1024
): { width: number; height: number } {
	const aspectRatio = originalWidth / originalHeight;

	if (originalWidth > originalHeight) {
		return {
			width: Math.min(targetSize, originalWidth),
			height: Math.min(Math.round(targetSize / aspectRatio), originalHeight),
		};
	} else {
		return {
			width: Math.min(Math.round(targetSize * aspectRatio), originalWidth),
			height: Math.min(targetSize, originalHeight),
		};
	}
}

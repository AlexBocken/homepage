import { generateWithOllama, imageToBase64 } from './ollama.js';
import { resizeAndEncodeImage } from './imageUtils.js';
import { IMAGE_DIR } from '$env/static/private';
import { join } from 'path';

export interface RecipeContext {
	name: string;
	category: string;
	ingredients?: string[];
	tags?: string[];
}

export interface AltTextResult {
	de: string;
	en: string;
}

/**
 * Generate alt text for a recipe image in both German and English
 * @param imagePath - Relative path or filename of the image (e.g., "brot.a1b2c3d4.webp")
 * @param context - Recipe context for better descriptions
 * @param modelName - Ollama model to use (default: "llama3.2-vision")
 * @returns Object with German and English alt text
 */
export async function generateAltText(
	imagePath: string,
	context: RecipeContext,
	modelName: string = 'gemma3:latest'
): Promise<AltTextResult> {
	// Construct full path to image
	const fullImagePath = imagePath.startsWith('/')
		? imagePath
		: join(IMAGE_DIR, 'rezepte', 'full', imagePath);

	// Convert image to base64 with optimization
	// Resize to 1024x1024 max for better performance
	// This reduces a 2000x2000 image to ~1024x1024, saving ~75% memory
	const imageBase64 = await resizeAndEncodeImage(fullImagePath, {
		maxWidth: 1024,
		maxHeight: 1024,
		quality: 85,
		format: 'jpeg',
	});

	// Generate both German and English in parallel
	const [de, en] = await Promise.all([
		generateGermanAltText(imageBase64, context, modelName),
		generateEnglishAltText(imageBase64, context, modelName),
	]);

	return { de, en };
}

/**
 * Generate German alt text
 */
async function generateGermanAltText(
	imageBase64: string,
	context: RecipeContext,
	modelName: string
): Promise<string> {
	const prompt = buildPrompt('de', context);

	const response = await generateWithOllama({
		model: modelName,
		prompt,
		images: [imageBase64],
		options: {
			temperature: 0.3, // Lower temperature for consistent descriptions
			max_tokens: 100,
		},
	});

	return cleanAltText(response);
}

/**
 * Generate English alt text
 */
async function generateEnglishAltText(
	imageBase64: string,
	context: RecipeContext,
	modelName: string
): Promise<string> {
	const prompt = buildPrompt('en', context);

	const response = await generateWithOllama({
		model: modelName,
		prompt,
		images: [imageBase64],
		options: {
			temperature: 0.3,
			max_tokens: 100,
		},
	});

	return cleanAltText(response);
}

/**
 * Build context-aware prompt for alt text generation
 */
function buildPrompt(lang: 'de' | 'en', context: RecipeContext): string {
	if (lang === 'de') {
		return `Erstelle einen prägnanten Alt-Text (maximal 10 Wörter, 125 Zeichen) für dieses Rezeptbild auf Deutsch.

Rezept: ${context.name}
Kategorie: ${context.category}
${context.tags ? `Stichwörter: ${context.tags.slice(0, 3).join(', ')}` : ''}

Beschreibe NUR das SICHTBARE im Bild: das Aussehen des Gerichts, Farben, Präsentation, Textur und Garnierung. Sei beschreibend aber prägnant für Screenreader. Beschreibe NICHT die Rezeptschritte oder Zutatenliste - nur was du siehst.

Antworte NUR mit dem Alt-Text, ohne Erklärung oder Anführungszeichen.`;
	} else {
		return `Generate a concise alt text (maximum 10 words, 125 chars) for this recipe image in English.

Recipe: ${context.name}
Category: ${context.category}
${context.tags ? `Keywords: ${context.tags.slice(0, 3).join(', ')}` : ''}

Describe ONLY what's VISIBLE in the image: the appearance of the dish, colors, presentation, texture, and garnishes. Be descriptive but concise for screen readers. Do NOT describe the recipe steps or ingredients list - only what you see.

Respond with ONLY the alt text, no explanation or quotes.`;
	}
}

/**
 * Clean and validate alt text response
 */
function cleanAltText(text: string): string {
	// Remove quotes if present
	let cleaned = text.replace(/^["']|["']$/g, '');

	// Remove "Alt text:" prefix if present
	cleaned = cleaned.replace(/^(Alt[- ]?text|Alternativer Text):\s*/i, '');

	// Trim whitespace
	cleaned = cleaned.trim();

	// Truncate to 125 characters if too long
	if (cleaned.length > 125) {
		cleaned = cleaned.substring(0, 122) + '...';
	}

	return cleaned;
}

/**
 * Batch generate alt text for multiple images
 */
export async function generateBatchAltText(
	images: Array<{ path: string; context: RecipeContext }>,
	modelName: string = 'gemma3:latest',
	onProgress?: (current: number, total: number, result: AltTextResult) => void
): Promise<AltTextResult[]> {
	const results: AltTextResult[] = [];

	for (let i = 0; i < images.length; i++) {
		const { path, context } = images[i];

		try {
			const result = await generateAltText(path, context, modelName);
			results.push(result);

			if (onProgress) {
				onProgress(i + 1, images.length, result);
			}
		} catch (error) {
			console.error(`Failed to generate alt text for ${path}:`, error);
			// Return empty strings on error
			results.push({ de: '', en: '' });
		}
	}

	return results;
}

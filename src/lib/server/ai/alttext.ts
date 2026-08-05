import { generateWithOllama, imageToBase64 } from './ollama.js';
import { resizeAndEncodeImage, getImageDimensions } from './imageUtils.js';
import { IMAGE_DIR } from '$env/static/private';
import { join } from 'path';
import { access } from 'fs/promises';

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

/** Ollama vision model used when the caller doesn't pick one. */
export const DEFAULT_ALT_TEXT_MODEL = 'qwen3.5:9b';

/**
 * Longest edge handed to the vision model. Alt text is one sentence about what the
 * dish looks like — colour, plating, garnish — which survives aggressive downscaling
 * fine. Image tokens dominate prompt-eval time, and they scale with area, so 512 is
 * ~4x cheaper than the 1024 this used to send for no useful loss in the description.
 */
const VISION_MAX_DIMENSION = 512;

/**
 * Generate alt text for a recipe image in both German and English
 * @param imagePath - Relative path or filename of the image (e.g., "brot.a1b2c3d4.webp")
 * @param context - Recipe context for better descriptions
 * @param modelName - Ollama model to use (default: DEFAULT_ALT_TEXT_MODEL)
 * @returns Object with German and English alt text
 */
export async function generateAltText(
	imagePath: string,
	context: RecipeContext,
	modelName: string = DEFAULT_ALT_TEXT_MODEL
): Promise<AltTextResult> {
	const startedAt = Date.now();
	console.log(`[alt-text] start "${context.name}" image=${imagePath} model=${modelName}`);

	// Prefer the 800px thumbnail over the full-size original: it is already close to
	// what the model needs, so sharp decodes a few hundred KB instead of a multi-MB
	// original. Older images predate the thumbnail pipeline, so fall back to full/.
	const sourcePath = imagePath.startsWith('/')
		? imagePath
		: await pickImageSource(imagePath);

	const resizeStart = Date.now();
	const sourceDims = await getImageDimensions(sourcePath).catch(() => null);
	const imageBase64 = await resizeAndEncodeImage(sourcePath, {
		maxWidth: VISION_MAX_DIMENSION,
		maxHeight: VISION_MAX_DIMENSION,
		quality: 85,
		format: 'jpeg',
	});
	console.log(
		`[alt-text] source ${sourceDims ? `${sourceDims.width}x${sourceDims.height}` : '?'} ` +
			`-> max ${VISION_MAX_DIMENSION}px in ${elapsed(resizeStart)}, ` +
			`${(imageBase64.length / 1024).toFixed(0)}KB base64`
	);

	// One call for both languages. Encoding the image through the vision tower is the
	// expensive part of a request and it is identical for both prompts, so asking
	// twice paid that cost twice for nothing. The two descriptions are short and
	// independent enough that a single response handles both fine.
	const result = await generateBilingualAltText(imageBase64, context, modelName);

	console.log(
		`[alt-text] finished "${context.name}" in ${elapsed(startedAt)} — ` +
			`de="${result.de}" en="${result.en}"`
	);
	return result;
}

const elapsed = (start: number) => `${((Date.now() - start) / 1000).toFixed(1)}s`;

/**
 * Resolve a recipe image filename to the cheapest variant on disk: the 800px
 * thumbnail if it exists, otherwise the full-size original.
 */
async function pickImageSource(filename: string): Promise<string> {
	const thumbPath = join(IMAGE_DIR, 'rezepte', 'thumb', filename);
	const fullPath = join(IMAGE_DIR, 'rezepte', 'full', filename);

	try {
		await access(thumbPath);
		console.log(`[alt-text] using thumbnail: ${thumbPath}`);
		return thumbPath;
	} catch {
		console.log(`[alt-text] no thumbnail, falling back to full size: ${fullPath}`);
		return fullPath;
	}
}

/**
 * Ask for both languages in a single generation and split the answer.
 *
 * Falls back to two single-language calls if the model ignores the requested
 * format, so a badly-behaved model degrades in speed rather than in output.
 */
async function generateBilingualAltText(
	imageBase64: string,
	context: RecipeContext,
	modelName: string
): Promise<AltTextResult> {
	const response = await generateWithOllama({
		model: modelName,
		prompt: buildBilingualPrompt(context),
		images: [imageBase64],
		think: false,
		keep_alive: '15m',
		options: {
			temperature: 0.3, // Lower temperature for consistent descriptions
			num_predict: 160, // two short captions plus the two labels
		},
	});

	const parsed = parseBilingualResponse(response);
	if (parsed) return parsed;

	console.warn(
		`[alt-text] could not parse DE/EN out of response, falling back to two calls. Raw: ${response.slice(0, 300)}`
	);

	const [de, en] = await Promise.all([
		generateSingleAltText(imageBase64, context, modelName, 'de'),
		generateSingleAltText(imageBase64, context, modelName, 'en'),
	]);
	return { de, en };
}

/**
 * Single-language generation. Only used as the fallback path.
 */
async function generateSingleAltText(
	imageBase64: string,
	context: RecipeContext,
	modelName: string,
	lang: 'de' | 'en'
): Promise<string> {
	const response = await generateWithOllama({
		model: modelName,
		prompt: buildPrompt(lang, context),
		images: [imageBase64],
		think: false,
		keep_alive: '15m',
		options: {
			temperature: 0.3,
			num_predict: 80,
		},
	});

	return cleanAltText(response);
}

/**
 * Pull the two captions out of a `DE: … / EN: …` response. Returns null if either
 * label is missing so the caller can fall back rather than store a mangled string.
 */
function parseBilingualResponse(response: string): AltTextResult | null {
	// Reasoning models may still prepend a <think> block even with think:false.
	const body = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

	const de = body.match(/^\s*DE\s*:\s*(.+)$/im)?.[1];
	const en = body.match(/^\s*EN\s*:\s*(.+)$/im)?.[1];
	if (!de || !en) return null;

	const cleanedDe = cleanAltText(de);
	const cleanedEn = cleanAltText(en);
	if (!cleanedDe || !cleanedEn) return null;

	return { de: cleanedDe, en: cleanedEn };
}

/**
 * Prompt asking for both languages at once, in a format that is trivial to split.
 */
function buildBilingualPrompt(context: RecipeContext): string {
	return `Describe this recipe photo for a screen reader, in German and in English.

Recipe: ${context.name}
Category: ${context.category}
${context.tags ? `Keywords: ${context.tags.slice(0, 3).join(', ')}` : ''}

Describe ONLY what is VISIBLE: the appearance of the dish, colors, presentation, texture, and garnishes. Do NOT describe recipe steps or the ingredient list. Each description must be at most 10 words and 125 characters.

Answer with exactly two lines and nothing else:
DE: <German description>
EN: <English description>`;
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
	modelName: string = DEFAULT_ALT_TEXT_MODEL,
	onProgress?: (current: number, total: number, result: AltTextResult) => void
): Promise<AltTextResult[]> {
	const results: AltTextResult[] = [];

	console.log(`[alt-text] batch of ${images.length} images, model=${modelName}`);

	for (let i = 0; i < images.length; i++) {
		const { path, context } = images[i];

		try {
			console.log(`[alt-text] batch item ${i + 1}/${images.length}: ${path}`);
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

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAltText, type RecipeContext } from '$lib/server/ai/alttext.js';
import { checkOllamaHealth } from '$lib/server/ai/ollama.js';
import { Recipe } from '$models/Recipe.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	const session = await locals.auth();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { shortName, imageIndex, modelName } = body;

		if (!shortName || imageIndex === undefined) {
			throw error(400, 'Missing required fields: shortName and imageIndex');
		}

		// Check if Ollama is available
		const isOllamaAvailable = await checkOllamaHealth();
		if (!isOllamaAvailable) {
			throw error(503, 'Ollama service is not available. Make sure Ollama is running.');
		}

		// Fetch recipe from database
		const recipe = await Recipe.findOne({ short_name: shortName });
		if (!recipe) {
			throw error(404, 'Recipe not found');
		}

		// Validate image index
		if (!recipe.images || !recipe.images[imageIndex]) {
			throw error(404, 'Image not found at specified index');
		}

		const image = recipe.images[imageIndex];

		// Prepare context for alt text generation
		const context: RecipeContext = {
			name: recipe.name,
			category: recipe.category,
			tags: recipe.tags,
		};

		// Generate alt text in both languages
		const altTextResult = await generateAltText(
			image.mediapath,
			context,
			modelName || 'gemma3:latest'
		);

		// Update recipe in database
		recipe.images[imageIndex].alt = altTextResult.de;

		// Ensure translations.en.images array exists and has the right length
		if (!recipe.translations) {
			recipe.translations = { en: { images: [] } };
		}
		if (!recipe.translations.en) {
			recipe.translations.en = { images: [] };
		}
		if (!recipe.translations.en.images) {
			recipe.translations.en.images = [];
		}

		// Ensure the en.images array has entries for all images
		while (recipe.translations.en.images.length <= imageIndex) {
			recipe.translations.en.images.push({ alt: '', caption: '' });
		}

		// Update English alt text
		recipe.translations.en.images[imageIndex].alt = altTextResult.en;

		// Save to database
		await recipe.save();

		return json({
			success: true,
			altText: altTextResult,
			message: 'Alt text generated and saved successfully',
		});
	} catch (err) {
		console.error('Error generating alt text:', err);

		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, err instanceof Error ? err.message : 'Failed to generate alt text');
	}
};

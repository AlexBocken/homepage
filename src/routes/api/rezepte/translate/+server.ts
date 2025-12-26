import { json, error } from '@sveltejs/kit';
import { translationService } from '$lib/../utils/translation';
import type { RequestHandler } from './$types';

/**
 * POST /api/rezepte/translate
 * Translates recipe data from German to English using DeepL API
 *
 * Request body:
 * - recipe: Recipe object with German content
 * - fields?: Optional array of specific fields to translate (for partial updates)
 *
 * Response:
 * - translatedRecipe: Translated recipe data
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { recipe, fields } = body;

		if (!recipe) {
			throw error(400, 'Recipe data is required');
		}

		// Validate that recipe has required fields
		if (!recipe.name || !recipe.description) {
			throw error(400, 'Recipe must have at least name and description');
		}

		let translatedRecipe;

		// If specific fields are provided, translate only those
		if (fields && Array.isArray(fields) && fields.length > 0) {
			translatedRecipe = await translationService.translateFields(recipe, fields);
		} else {
			// Translate entire recipe
			translatedRecipe = await translationService.translateRecipe(recipe);
		}

		return json({
			success: true,
			translatedRecipe,
		});

	} catch (err: any) {
		console.error('Translation API error:', err);

		// Handle specific error cases
		if (err.message?.includes('DeepL API')) {
			throw error(503, `Translation service error: ${err.message}`);
		}

		if (err.message?.includes('API key not configured')) {
			throw error(500, 'Translation service is not configured. Please add DEEPL_API_KEY to environment variables.');
		}

		// Re-throw SvelteKit errors
		if (err.status) {
			throw err;
		}

		// Generic error
		throw error(500, `Translation failed: ${err.message || 'Unknown error'}`);
	}
};

/**
 * GET /api/rezepte/translate/health
 * Health check endpoint to verify translation service is configured
 */
export const GET: RequestHandler = async () => {
	try {
		// Simple check to verify API key is configured
		const isConfigured = process.env.DEEPL_API_KEY ? true : false;

		return json({
			configured: isConfigured,
			service: 'DeepL Translation API',
			status: isConfigured ? 'ready' : 'not configured',
		});
	} catch (err: any) {
		return json({
			configured: false,
			status: 'error',
			error: err.message,
		}, { status: 500 });
	}
};

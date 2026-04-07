import { json, error } from '@sveltejs/kit';
import { translationService } from '$lib/../utils/translation';
import type { RequestHandler } from './$types';
import { requireGroup } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireGroup(locals, 'rezepte_users');
	try {
		const body = await request.json();
		const { recipe, fields, oldRecipe, existingTranslation } = body;

		if (!recipe) {
			throw error(400, 'Recipe data is required');
		}

		// Validate that recipe has required fields
		if (!recipe.name || !recipe.description) {
			throw error(400, 'Recipe must have at least name and description');
		}

		let translatedRecipe;
		let translationMetadata;

		// If specific fields are provided, translate only those with granular detection
		if (fields && Array.isArray(fields) && fields.length > 0) {
			const result = await translationService.translateFields(
				recipe,
				fields,
				oldRecipe, // For granular change detection
				existingTranslation // To merge with existing translations
			);
			translatedRecipe = result.translatedRecipe;
			translationMetadata = result.translationMetadata;
		} else {
			// Translate entire recipe
			translatedRecipe = await translationService.translateRecipe(recipe);
			translationMetadata = null; // Full translation, all fields are new
		}

		return json({
			success: true,
			translatedRecipe,
			translationMetadata,
		});

	} catch (err: unknown) {
		console.error('Translation API error:', err);

		const message = err instanceof Error ? err.message : String(err);

		// Handle specific error cases
		if (message?.includes('DeepL API')) {
			throw error(503, `Translation service error: ${message}`);
		}

		if (message?.includes('API key not configured')) {
			throw error(500, 'Translation service is not configured. Please add DEEPL_API_KEY to environment variables.');
		}

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error
		throw error(500, `Translation failed: ${message || 'Unknown error'}`);
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
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return json({
			configured: false,
			status: 'error',
			error: message,
		}, { status: 500 });
	}
};

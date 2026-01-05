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
		const { filter = 'missing', limit = 10, modelName } = body;

		// Check if Ollama is available
		const isOllamaAvailable = await checkOllamaHealth();
		if (!isOllamaAvailable) {
			throw error(503, 'Ollama service is not available. Make sure Ollama is running.');
		}

		// Build query based on filter
		let query: any = { images: { $exists: true, $ne: [] } };

		if (filter === 'missing') {
			// Find recipes with images but missing alt text
			query = {
				images: {
					$elemMatch: {
						mediapath: { $exists: true },
						$or: [{ alt: { $exists: false } }, { alt: '' }],
					},
				},
			};
		} else if (filter === 'all') {
			// Process all recipes with images
			query = { images: { $exists: true, $ne: [] } };
		}

		// Fetch recipes
		const recipes = await Recipe.find(query).limit(limit);

		if (recipes.length === 0) {
			return json({
				success: true,
				processed: 0,
				message: 'No recipes found matching criteria',
			});
		}

		const results: Array<{
			shortName: string;
			name: string;
			processed: number;
			failed: number;
		}> = [];

		// Process each recipe
		for (const recipe of recipes) {
			let processed = 0;
			let failed = 0;

			for (let i = 0; i < recipe.images.length; i++) {
				const image = recipe.images[i];

				// Skip if alt text exists and we're only processing missing ones
				if (filter === 'missing' && image.alt) {
					continue;
				}

				try {
					// Prepare context
					const context: RecipeContext = {
						name: recipe.name,
						category: recipe.category,
						tags: recipe.tags,
					};

					// Generate alt text
					const altTextResult = await generateAltText(
						image.mediapath,
						context,
						modelName || 'gemma3:latest'
					);

					// Update German alt text
					recipe.images[i].alt = altTextResult.de;

					// Ensure translations.en.images array exists
					if (!recipe.translations) {
						recipe.translations = { en: { images: [] } };
					}
					if (!recipe.translations.en) {
						recipe.translations.en = { images: [] };
					}
					if (!recipe.translations.en.images) {
						recipe.translations.en.images = [];
					}

					// Ensure array has enough entries
					while (recipe.translations.en.images.length <= i) {
						recipe.translations.en.images.push({ alt: '', caption: '' });
					}

					// Update English alt text
					recipe.translations.en.images[i].alt = altTextResult.en;

					processed++;
				} catch (err) {
					console.error(`Failed to process image ${i} for recipe ${recipe.short_name}:`, err);
					failed++;
				}
			}

			// Save recipe if any images were processed
			if (processed > 0) {
				await recipe.save();
			}

			results.push({
				shortName: recipe.short_name,
				name: recipe.name,
				processed,
				failed,
			});
		}

		return json({
			success: true,
			processed: results.reduce((sum, r) => sum + r.processed, 0),
			failed: results.reduce((sum, r) => sum + r.failed, 0),
			results,
		});
	} catch (err) {
		console.error('Error in bulk alt text generation:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, err instanceof Error ? err.message : 'Failed to generate alt text');
	}
};

/**
 * GET endpoint to check status and get stats
 */
export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication
	const session = await locals.auth();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Count recipes with missing alt text
		const totalWithImages = await Recipe.countDocuments({
			images: { $exists: true, $ne: [] },
		});

		const missingAltText = await Recipe.countDocuments({
			images: {
				$elemMatch: {
					mediapath: { $exists: true },
					$or: [{ alt: { $exists: false } }, { alt: '' }],
				},
			},
		});

		// Check Ollama health
		const ollamaAvailable = await checkOllamaHealth();

		return json({
			totalWithImages,
			missingAltText,
			ollamaAvailable,
		});
	} catch (err) {
		throw error(500, 'Failed to fetch statistics');
	}
};

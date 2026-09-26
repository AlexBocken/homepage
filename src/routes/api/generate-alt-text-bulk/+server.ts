import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAltText, DEFAULT_ALT_TEXT_MODEL, type RecipeContext } from '$lib/server/ai/alttext.js';
import { checkOllamaHealth, logModelAvailability, logRuntimePlacement } from '$lib/server/ai/ollama.js';
import { Recipe } from '$models/Recipe.js';
import { requireAuth, requireGroup } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireGroup(locals, 'rezepte_users');

	try {
		const body = await request.json();
		const { filter = 'missing', limit = 10, modelName } = body;
		const model = modelName || DEFAULT_ALT_TEXT_MODEL;
		const runStart = Date.now();

		console.log(`[alt-text-bulk] request: filter=${filter} limit=${limit} model=${model}`);

		// Check if Ollama is available
		const isOllamaAvailable = await checkOllamaHealth();
		if (!isOllamaAvailable) {
			throw error(503, 'Ollama service is not available. Make sure Ollama is running.');
		}
		await logModelAvailability(model);

		// Build query based on filter
		let query: Record<string, unknown> = { images: { $exists: true, $ne: [] } };

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

		const totalImages = recipes.reduce(
			(sum, r) =>
				sum + (r.images ?? []).filter((img) => !(filter === 'missing' && img.alt)).length,
			0
		);
		console.log(
			`[alt-text-bulk] matched ${recipes.length} recipes / ${totalImages} images to process. ` +
				`Each image = 2 Ollama calls, so ${totalImages * 2} generations total. ` +
				`The HTTP response is only sent after ALL of them finish.`
		);

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
		let imageCounter = 0;
		for (const [recipeIndex, recipe] of recipes.entries()) {
			let processed = 0;
			let failed = 0;
			if (!recipe.images) continue;

			console.log(
				`[alt-text-bulk] recipe ${recipeIndex + 1}/${recipes.length}: ${recipe.short_name} ` +
					`(${recipe.images.length} images)`
			);

			for (let i = 0; i < recipe.images.length; i++) {
				const image = recipe.images[i];

				// Skip if alt text exists and we're only processing missing ones
				if (filter === 'missing' && image.alt) {
					console.log(`[alt-text-bulk]   image ${i}: skipped (alt already set)`);
					continue;
				}

				imageCounter++;
				const imageStart = Date.now();
				console.log(
					`[alt-text-bulk]   image ${i} (${imageCounter}/${totalImages} overall): ${image.mediapath}`
				);

				try {
					// Prepare context
					const context: RecipeContext = {
						name: recipe.name,
						category: recipe.category,
						tags: recipe.tags,
					};

					// Generate alt text
					const altTextResult = await generateAltText(image.mediapath, context, model);

					// Update German alt text
					recipe.images[i].alt = altTextResult.de;

					// Ensure translations.en.images array exists
					if (!recipe.translations) {
						(recipe as any).translations = { en: { images: [] } };
					}
					if (!recipe.translations!.en) {
						(recipe.translations as any).en = { images: [] };
					}
					if (!recipe.translations!.en!.images) {
						(recipe.translations!.en as any).images = [];
					}

					// Ensure array has enough entries
					while (recipe.translations!.en!.images!.length <= i) {
						recipe.translations!.en!.images!.push({ alt: '', caption: '' } as any);
					}

					// Update English alt text
					recipe.translations!.en!.images![i].alt = altTextResult.en;

					processed++;
					// After the first image the model is resident, so this reports the
					// real GPU/CPU split rather than an empty pre-load state.
					if (imageCounter === 1) await logRuntimePlacement();
					console.log(
						`[alt-text-bulk]   image ${i} done in ${((Date.now() - imageStart) / 1000).toFixed(1)}s ` +
							`(${imageCounter}/${totalImages} overall, ` +
							`${((Date.now() - runStart) / 1000).toFixed(0)}s into the run)`
					);
				} catch (err) {
					console.error(`Failed to process image ${i} for recipe ${recipe.short_name}:`, err);
					failed++;
				}
			}

			// Save recipe if any images were processed
			if (processed > 0) {
				console.log(`[alt-text-bulk] saving ${recipe.short_name} (${processed} images updated)`);
				await recipe.save();
				console.log(`[alt-text-bulk] saved ${recipe.short_name}`);
			}

			results.push({
				shortName: recipe.short_name,
				name: recipe.name,
				processed,
				failed,
			});
		}

		console.log(
			`[alt-text-bulk] run complete in ${((Date.now() - runStart) / 1000).toFixed(0)}s — ` +
				`processed=${results.reduce((s, r) => s + r.processed, 0)} ` +
				`failed=${results.reduce((s, r) => s + r.failed, 0)}. Sending response.`
		);

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
	await requireAuth(locals);

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

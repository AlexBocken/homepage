import type { RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { error } from '@sveltejs/kit';

/**
 * GET /api/recipes/items/[name]
 * Fetch an English recipe by its English short_name
 */
export const GET: RequestHandler = async ({ params }) => {
	await dbConnect();

	try {
		// Find recipe by English short_name and populate base recipe references
		const recipe = await Recipe.findOne({
			"translations.en.short_name": params.name
		})
		.populate({
			path: 'translations.en.ingredients.baseRecipeRef',
			select: 'short_name name ingredients instructions translations',
			populate: {
				path: 'ingredients.baseRecipeRef',
				select: 'short_name name ingredients instructions translations',
				populate: {
					path: 'ingredients.baseRecipeRef',
					select: 'short_name name ingredients instructions translations'
				}
			}
		})
		.populate({
			path: 'translations.en.instructions.baseRecipeRef',
			select: 'short_name name ingredients instructions translations',
			populate: {
				path: 'instructions.baseRecipeRef',
				select: 'short_name name ingredients instructions translations',
				populate: {
					path: 'instructions.baseRecipeRef',
					select: 'short_name name ingredients instructions translations'
				}
			}
		})
		.lean();

		if (!recipe) {
			throw error(404, 'Recipe not found');
		}

		if (!recipe.translations?.en) {
			throw error(404, 'English translation not available for this recipe');
		}

		// Return English translation with necessary metadata
		let englishRecipe: any = {
			_id: recipe._id,
			short_name: recipe.translations.en.short_name,
			name: recipe.translations.en.name,
			description: recipe.translations.en.description,
			preamble: recipe.translations.en.preamble || '',
			addendum: recipe.translations.en.addendum || '',
			note: recipe.translations.en.note || '',
			category: recipe.translations.en.category,
			tags: recipe.translations.en.tags || [],
			ingredients: recipe.translations.en.ingredients || [],
			instructions: recipe.translations.en.instructions || [],
			images: recipe.images || [], // Use original images with full paths, but English alt/captions
			// Use English translations for timing/metadata fields when available, fallback to German version
			icon: recipe.icon || '',
			dateCreated: recipe.dateCreated,
			dateModified: recipe.dateModified,
			season: recipe.season || [],
			baking: recipe.translations.en.baking || recipe.baking || { temperature: '', length: '', mode: '' },
			preparation: recipe.translations.en.preparation || recipe.preparation || '',
			fermentation: recipe.translations.en.fermentation || recipe.fermentation || { bulk: '', final: '' },
			portions: recipe.translations.en.portions || recipe.portions || '',
			cooking: recipe.translations.en.cooking || recipe.cooking || '',
			total_time: recipe.translations.en.total_time || recipe.total_time || '',
			// Include translation status for display
			translationStatus: recipe.translations.en.translationStatus,
			// Include German short_name for language switcher
			germanShortName: recipe.short_name,
		};

		// Recursively map populated base recipe refs to resolvedRecipe field
		function mapBaseRecipeRefs(items: any[]): any[] {
			return items.map((item: any) => {
				if (item.type === 'reference' && item.baseRecipeRef) {
					const resolvedRecipe = { ...item.baseRecipeRef };

					// Recursively map nested baseRecipeRefs
					if (resolvedRecipe.ingredients) {
						resolvedRecipe.ingredients = mapBaseRecipeRefs(resolvedRecipe.ingredients);
					}
					if (resolvedRecipe.instructions) {
						resolvedRecipe.instructions = mapBaseRecipeRefs(resolvedRecipe.instructions);
					}

					return { ...item, resolvedRecipe };
				}
				return item;
			});
		}

		if (englishRecipe.ingredients) {
			englishRecipe.ingredients = mapBaseRecipeRefs(englishRecipe.ingredients);
		}

		if (englishRecipe.instructions) {
			englishRecipe.instructions = mapBaseRecipeRefs(englishRecipe.instructions);
		}

		// Merge English alt/caption with original image paths
		// Handle both array and single object (there's a bug in add page that sometimes saves as object)
		const imagesArray = Array.isArray(recipe.images) ? recipe.images : (recipe.images ? [recipe.images] : []);

		if (imagesArray.length > 0) {
			const translatedImages = recipe.translations.en.images || [];

			if (translatedImages.length > 0) {
				englishRecipe.images = imagesArray.map((img: any, index: number) => ({
					mediapath: img.mediapath,
					alt: translatedImages[index]?.alt || img.alt || '',
					caption: translatedImages[index]?.caption || img.caption || '',
				}));
			} else {
				// No translated image captions, use German ones
				englishRecipe.images = imagesArray.map((img: any) => ({
					mediapath: img.mediapath,
					alt: img.alt || '',
					caption: img.caption || '',
				}));
			}
		}

		return new Response(JSON.stringify(englishRecipe), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
			},
		});
	} catch (err: any) {
		console.error('Error fetching English recipe:', err);

		if (err.status) {
			throw err;
		}

		throw error(500, 'Failed to fetch recipe');
	}
};

import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from './$types';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { invalidateRecipeCaches } from '$lib/server/cache';
import { IMAGE_DIR } from '$env/static/private';
import { processAndSaveRecipeImage } from '$utils/imageProcessing';
import {
	extractRecipeFromFormData,
	validateRecipeData,
	serializeRecipeForDatabase
} from '$utils/recipeFormHelpers';

export const load: PageServerLoad = async ({locals, params}) => {
    // Add is German-only - redirect to German version
    if (params.recipeLang === 'recipes') {
        throw redirect(301, '/rezepte/add');
    }

    const session = await locals.auth();
    return {
		user: session?.user
    };
};

export const actions = {
	default: async ({ request, locals, params }) => {
		// Check authentication
		const auth = await locals.auth();
		if (!auth) {
			return fail(401, {
				error: 'You must be logged in to add recipes',
				requiresAuth: true
			});
		}

		try {
			const formData = await request.formData();
			console.log('[RecipeAdd] Form data received');

			// Extract recipe data from FormData
			const recipeData = extractRecipeFromFormData(formData);
			console.log('[RecipeAdd] Recipe data extracted:', {
				short_name: recipeData.short_name,
				name: recipeData.name
			});

			// Validate required fields
			const validationErrors = validateRecipeData(recipeData);
			if (validationErrors.length > 0) {
				console.error('[RecipeAdd] Validation errors:', validationErrors);
				return fail(400, {
					error: validationErrors.join(', '),
					errors: validationErrors,
					values: Object.fromEntries(formData)
				});
			}

			// Handle optional image upload
			const recipeImage = formData.get('recipe_image') as File | null;
			console.log('[RecipeAdd] Recipe image from form:', {
				hasImage: !!recipeImage,
				size: recipeImage?.size,
				name: recipeImage?.name,
				type: recipeImage?.type
			});

			if (recipeImage && recipeImage.size > 0) {
				try {
					console.log('[RecipeAdd] Starting image processing...');
					// Process and save the image
					const { filename, color } = await processAndSaveRecipeImage(
						recipeImage,
						recipeData.short_name,
						IMAGE_DIR
					);

					console.log('[RecipeAdd] Image processed successfully, filename:', filename);
					recipeData.images = [{
						mediapath: filename,
						alt: '',
						caption: '',
						color
					}];
				} catch (imageError: unknown) {
					console.error('[RecipeAdd] Image processing error:', imageError);
					const message = imageError instanceof Error ? imageError.message : String(imageError);
					return fail(400, {
						error: `Failed to process image: ${message}`,
						errors: ['Image processing failed'],
						values: Object.fromEntries(formData)
					});
				}
			} else {
				console.log('[RecipeAdd] No image uploaded, using placeholder');
				// No image uploaded - use placeholder based on short_name
				recipeData.images = [{
					mediapath: `${recipeData.short_name}.webp`,
					alt: '',
					caption: ''
				}];
			}

			// Serialize for database
			const recipe_json = serializeRecipeForDatabase(recipeData);

			// Connect to database and create recipe
			await dbConnect();

			try {
				await Recipe.create(recipe_json);

				// Invalidate recipe caches after successful creation
				await invalidateRecipeCaches();

				// Redirect to the new recipe page
				throw redirect(303, `/${params.recipeLang}/${recipeData.short_name}`);
			} catch (dbError: unknown) {
				// Re-throw redirects (they're not errors)
				if (dbError && typeof dbError === 'object' && 'status' in dbError) {
					const status = (dbError as { status: number }).status;
					if (status >= 300 && status < 400) {
						throw dbError;
					}
				}

				console.error('Database error creating recipe:', dbError);

				// Check for duplicate key error
				if (dbError && typeof dbError === 'object' && 'code' in dbError && (dbError as { code: number }).code === 11000) {
					return fail(400, {
						error: `A recipe with the short name "${recipeData.short_name}" already exists. Please choose a different short name.`,
						errors: ['Duplicate short_name'],
						values: Object.fromEntries(formData)
					});
				}

				const dbMessage = dbError instanceof Error ? dbError.message : String(dbError);
				return fail(500, {
					error: `Failed to create recipe: ${dbMessage || 'Unknown database error'}`,
					errors: [dbMessage],
					values: Object.fromEntries(formData)
				});
			}
		} catch (error: unknown) {
			// Re-throw redirects (they're not errors)
			if (error && typeof error === 'object' && 'status' in error) {
				const status = (error as { status: number }).status;
				if (status >= 300 && status < 400) {
					throw error;
				}
			}

			console.error('Error processing recipe submission:', error);

			const message = error instanceof Error ? error.message : String(error);
			return fail(500, {
				error: `Failed to process recipe: ${message || 'Unknown error'}`,
				errors: [message]
			});
		}
	}
} satisfies Actions;

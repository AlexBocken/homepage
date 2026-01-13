import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from './$types';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { invalidateRecipeCaches } from '$lib/server/cache';
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

			// Extract recipe data from FormData
			const recipeData = extractRecipeFromFormData(formData);

			// Validate required fields
			const validationErrors = validateRecipeData(recipeData);
			if (validationErrors.length > 0) {
				return fail(400, {
					error: validationErrors.join(', '),
					errors: validationErrors,
					values: Object.fromEntries(formData)
				});
			}

			// Handle optional image upload
			const uploadedImage = formData.get('uploaded_image_filename')?.toString();
			if (uploadedImage && uploadedImage.trim() !== '') {
				// Image was uploaded - use it
				recipeData.images = [{
					mediapath: uploadedImage,
					alt: '',
					caption: ''
				}];
			} else {
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
			} catch (dbError: any) {
				// Re-throw redirects (they're not errors)
				if (dbError?.status >= 300 && dbError?.status < 400) {
					throw dbError;
				}

				console.error('Database error creating recipe:', dbError);

				// Check for duplicate key error
				if (dbError.code === 11000) {
					return fail(400, {
						error: `A recipe with the short name "${recipeData.short_name}" already exists. Please choose a different short name.`,
						errors: ['Duplicate short_name'],
						values: Object.fromEntries(formData)
					});
				}

				return fail(500, {
					error: `Failed to create recipe: ${dbError.message || 'Unknown database error'}`,
					errors: [dbError.message],
					values: Object.fromEntries(formData)
				});
			}
		} catch (error: any) {
			// Re-throw redirects (they're not errors)
			if (error?.status >= 300 && error?.status < 400) {
				throw error;
			}

			console.error('Error processing recipe submission:', error);

			return fail(500, {
				error: `Failed to process recipe: ${error.message || 'Unknown error'}`,
				errors: [error.message],
				values: Object.fromEntries(formData)
			});
		}
	}
} satisfies Actions;

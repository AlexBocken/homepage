import type { Actions, PageServerLoad } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { invalidateRecipeCaches } from '$lib/server/cache';
import { IMAGE_DIR } from '$env/static/private';
import { rename, access, unlink } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import { processAndSaveRecipeImage } from '$utils/imageProcessing';
import {
	extractRecipeFromFormData,
	validateRecipeData,
	serializeRecipeForDatabase,
	detectChangedFields
} from '$utils/recipeFormHelpers';

/**
 * Delete recipe image files from all directories (full, thumb, placeholder)
 * Handles both hashed and unhashed versions for backward compatibility
 */
async function deleteRecipeImage(filename: string): Promise<void> {
	if (!filename) return;

	const imageDirectories = ['full', 'thumb'];

	// Extract basename to handle both hashed and unhashed versions
	const basename = filename
		.replace(/\.[a-f0-9]{8}\.webp$/, '') // Remove hash if present
		.replace(/\.webp$/, ''); // Remove extension

	const unhashedFilename = basename + '.webp';

	for (const dir of imageDirectories) {
		// Delete hashed version (if it's the hashed filename that was passed in)
		if (filename !== unhashedFilename) {
			try {
				await unlink(join(IMAGE_DIR, 'rezepte', dir, filename));
				console.log(`Deleted hashed image: ${dir}/${filename}`);
			} catch (err) {
				console.warn(`Could not delete hashed image ${dir}/${filename}:`, err);
			}
		}

		// Delete unhashed version
		try {
			await unlink(join(IMAGE_DIR, 'rezepte', dir, unhashedFilename));
			console.log(`Deleted unhashed image: ${dir}/${unhashedFilename}`);
		} catch (err) {
			console.warn(`Could not delete unhashed image ${dir}/${unhashedFilename}:`, err);
		}
	}
}

export const load: PageServerLoad = async ({ fetch, params, locals}) => {
    // Edit is German-only - redirect to German version
    if (params.recipeLang === 'recipes') {
        // We need to get the German short_name first
        const res = await fetch(`/api/recipes/items/${params.name}`);
        if (res.ok) {
            const recipe = await res.json();
            throw redirect(301, `/rezepte/edit/${recipe.germanShortName}`);
        }
        // If recipe not found, redirect to German recipes list
        throw redirect(301, '/rezepte');
    }

    const apiRes = await fetch(`/api/rezepte/items/${params.name}`);
    const recipe = await apiRes.json();
    const session = await locals.auth();
    return {
		recipe: recipe,
		user: session?.user
    };
};

export const actions = {
	default: async ({ request, locals, params }) => {
		// Check authentication
		const auth = await locals.auth();
		if (!auth) {
			return fail(401, {
				error: 'You must be logged in to edit recipes',
				requiresAuth: true
			});
		}

		try {
			const formData = await request.formData();

			// Extract recipe data from FormData
			const recipeData = extractRecipeFromFormData(formData);

			// Get original short_name for update query and image rename
			const originalShortName = formData.get('original_short_name')?.toString();
			if (!originalShortName) {
				return fail(400, {
					error: 'Original short name is required for edit',
					errors: ['Missing original_short_name'],
					values: Object.fromEntries(formData)
				});
			}

			// Validate required fields
			const validationErrors = validateRecipeData(recipeData);
			if (validationErrors.length > 0) {
				return fail(400, {
					error: validationErrors.join(', '),
					errors: validationErrors,
					values: Object.fromEntries(formData)
				});
			}

			// Handle image scenarios
			const recipeImage = formData.get('recipe_image') as File | null;
			const keepExistingImage = formData.get('keep_existing_image') === 'true';
			const existingImagePath = formData.get('existing_image_path')?.toString();

			if (recipeImage && recipeImage.size > 0) {
				try {
					// Process and save the new image
					const { filename, color } = await processAndSaveRecipeImage(
						recipeImage,
						recipeData.short_name,
						IMAGE_DIR
					);

					// Delete old image files
					if (existingImagePath && existingImagePath !== filename) {
						await deleteRecipeImage(existingImagePath);
					}

					recipeData.images = [{
						mediapath: filename,
						alt: existingImagePath ? (recipeData.images?.[0]?.alt || '') : '',
						caption: existingImagePath ? (recipeData.images?.[0]?.caption || '') : '',
						color
					}];
				} catch (imageError: any) {
					console.error('Image processing error:', imageError);
					return fail(400, {
						error: `Failed to process image: ${imageError.message}`,
						errors: ['Image processing failed'],
						values: Object.fromEntries(formData)
					});
				}
			} else if (keepExistingImage && existingImagePath) {
				// Keep existing image
				recipeData.images = [{
					mediapath: existingImagePath,
					alt: recipeData.images?.[0]?.alt || '',
					caption: recipeData.images?.[0]?.caption || ''
				}];
			} else {
				// No image provided - use placeholder based on short_name
				recipeData.images = [{
					mediapath: `${recipeData.short_name}.webp`,
					alt: '',
					caption: ''
				}];
			}

			// Handle short_name change (rename images)
			if (originalShortName !== recipeData.short_name) {
				const imageDirectories = ['full', 'thumb'];

				for (const dir of imageDirectories) {
					const oldPath = join(IMAGE_DIR, 'rezepte', dir, `${originalShortName}.webp`);
					const newPath = join(IMAGE_DIR, 'rezepte', dir, `${recipeData.short_name}.webp`);

					try {
						// Check if old file exists
						await access(oldPath, constants.F_OK);

						// Rename the file
						await rename(oldPath, newPath);
						console.log(`Renamed ${dir}/${originalShortName}.webp -> ${dir}/${recipeData.short_name}.webp`);
					} catch (err) {
						// File might not exist or rename failed - log but continue
						console.warn(`Could not rename ${dir}/${originalShortName}.webp:`, err);
					}
				}

				// Update image mediapath if it was using the old short_name
				if (recipeData.images[0].mediapath === `${originalShortName}.webp`) {
					recipeData.images[0].mediapath = `${recipeData.short_name}.webp`;
				}
			}

			// Serialize for database
			const recipe_json = serializeRecipeForDatabase(recipeData);

			// Connect to database and update recipe
			await dbConnect();

			try {
				const result = await Recipe.findOneAndUpdate(
					{ short_name: originalShortName },
					recipe_json,
					{ new: true }
				);

				if (!result) {
					return fail(404, {
						error: `Recipe with short name "${originalShortName}" not found`,
						errors: ['Recipe not found'],
						values: Object.fromEntries(formData)
					});
				}

				// Invalidate recipe caches after successful update
				await invalidateRecipeCaches();

				// Redirect to the updated recipe page (might have new short_name)
				throw redirect(303, `/${params.recipeLang}/${recipeData.short_name}`);
			} catch (dbError: any) {
				// Re-throw redirects (they're not errors)
				if (dbError?.status >= 300 && dbError?.status < 400) {
					throw dbError;
				}

				console.error('Database error updating recipe:', dbError);

				// Check for duplicate key error
				if (dbError.code === 11000) {
					return fail(400, {
						error: `A recipe with the short name "${recipeData.short_name}" already exists. Please choose a different short name.`,
						errors: ['Duplicate short_name'],
						values: Object.fromEntries(formData)
					});
				}

				return fail(500, {
					error: `Failed to update recipe: ${dbError.message || 'Unknown database error'}`,
					errors: [dbError.message],
					values: Object.fromEntries(formData)
				});
			}
		} catch (error: any) {
			// Re-throw redirects (they're not errors)
			if (error?.status >= 300 && error?.status < 400) {
				throw error;
			}

			console.error('Error processing recipe update:', error);

			return fail(500, {
				error: `Failed to process recipe update: ${error.message || 'Unknown error'}`,
				errors: [error.message],
				values: Object.fromEntries(formData)
			});
		}
	}
} satisfies Actions;

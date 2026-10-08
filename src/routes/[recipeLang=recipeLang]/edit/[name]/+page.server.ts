import type { Actions, PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { stripHtmlTags } from '$lib/js/stripHtmlTags';
import { relatedRecipeBriefs } from '$lib/server/recipeSimilarityIndex';
import { markRecipesChanged } from '$lib/server/recipeSimilarityIndex';
import { syncGlobalOverwrites } from '$lib/server/nutritionOverwriteSync';
import { deleteRecipeImage } from '$lib/server/recipeImages';
import { IMAGE_DIR } from '$env/static/private';
import { rename, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import {
	extractRecipeFromFormData,
	serializeRecipeForDatabase,
	splitClearedFields
} from '$utils/recipeFormHelpers';
import {
	requireRecipeEditor,
	formFailure,
	validationFailure,
	saveUploadedImage,
	dbFailure,
	unexpectedFailure
} from '$lib/server/recipeFormAction';

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
    const session = locals.session ?? await locals.auth();

    // Recipes that use this one as a base: deleting it copies its content into
    // them, which the delete confirmation names.
    await dbConnect();
    const referencedBy = recipe?._id
        ? await Recipe.find(
              { $or: [{ 'ingredients.baseRecipeRef': recipe._id }, { 'instructions.baseRecipeRef': recipe._id }] },
              { name: 1, short_name: 1, _id: 0 }
          ).lean()
        : [];

    // The related-recipe picker: every other recipe, and what the page shows now.
    const [others, shown] = await Promise.all([
        Recipe.find({ _id: { $ne: recipe?._id } }, { name: 1 }).lean(),
        relatedRecipeBriefs(params.name, 'rezepte').catch(() => []),
    ]);
    const recipeOptions = others
        .map((r) => ({ id: String(r._id), name: stripHtmlTags(r.name) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return {
		recipe: recipe,
		user: session?.user,
		referencedBy: referencedBy.map((r) => ({ name: r.name, short_name: r.short_name })),
		recipeOptions,
		relatedPreview: shown.map((r) => stripHtmlTags(r.name))
    };
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const denied = await requireRecipeEditor(locals, 'edit');
		if (denied) return denied;

		try {
			const formData = await request.formData();

			// Extract recipe data from FormData
			const recipeData = extractRecipeFromFormData(formData);

			// Get original short_name for update query and image rename
			const originalShortName = formData.get('original_short_name')?.toString();
			if (!originalShortName) {
				return formFailure(400, 'Original short name is required for edit', ['Missing original_short_name'], formData);
			}

			const invalid = validationFailure(recipeData, formData);
			if (invalid) return invalid;

			// Handle image scenarios
			const recipeImage = formData.get('recipe_image') as File | null;
			const keepExistingImage = formData.get('keep_existing_image') === 'true';
			const existingImagePath = formData.get('existing_image_path')?.toString();

			if (recipeImage && recipeImage.size > 0) {
				// Process and save the new image
				const saved = await saveUploadedImage(recipeImage, recipeData.short_name, formData);
				if ('failure' in saved) return saved.failure;

				// Delete old image files (deleteRecipeImage only logs what it can't remove)
				if (existingImagePath && existingImagePath !== saved.filename) {
					await deleteRecipeImage(existingImagePath);
				}

				recipeData.images = [{
					mediapath: saved.filename,
					alt: existingImagePath ? (recipeData.images?.[0]?.alt || '') : '',
					caption: existingImagePath ? (recipeData.images?.[0]?.caption || '') : '',
					blur: saved.blur
				}];
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
				if (recipeData.images?.[0]?.mediapath === `${originalShortName}.webp`) {
					recipeData.images![0].mediapath = `${recipeData.short_name}.webp`;
				}
			}

			// Serialize for database
			const { set: recipe_json, unset: cleared } = splitClearedFields(
				serializeRecipeForDatabase(recipeData)
			);

			// Connect to database and update recipe
			await dbConnect();

			try {
				// Ingredients or their mappings may have changed, which makes the stored
				// per-100 g figures a claim about a recipe that no longer exists.
				// Unsetting marks them "never calculated" and the listing endpoint
				// refills them; nothing recomputes a cache that is merely stale, so a
				// value left in place would be served forever.
				const result = await Recipe.findOneAndUpdate(
					{ short_name: originalShortName },
					{
						$set: recipe_json,
						$unset: { ...cleared, cachedPer100g: '', cachedTotalGrams: '' }
					},
					{ returnDocument: 'after' }
				);

				if (result) markRecipesChanged();
				if (!result) {
					return formFailure(404, `Recipe with short name "${originalShortName}" not found`, ['Recipe not found'], formData);
				}

				// Save nutrition mappings (deferred from nutrition UI).
				//
				// A rejected write is reported rather than logged: a mapping that fails
				// the schema — an unknown `source`, a NaN `fdcId` — discards the whole
				// array, and swallowing that showed the user a successful save while
				// their mapping work was gone. The recipe body itself is already
				// written by this point, which the message has to say.
				const nutritionMappingsJson = formData.get('nutritionMappings_json')?.toString();
				if (nutritionMappingsJson) {
					try {
						const mappings = JSON.parse(nutritionMappingsJson);
						if (mappings.length > 0) {
							await Recipe.updateOne(
								{ short_name: recipeData.short_name },
								{ $set: { nutritionMappings: mappings } }
							);
						}
					} catch (e) {
						console.error('Failed to save nutrition mappings:', e);
						return formFailure(
							500,
							`Das Rezept wurde gespeichert, die Nährwert-Zuordnungen aber nicht: ${e instanceof Error ? e.message : String(e)}`,
							['Nutrition mappings not saved'],
							formData
						);
					}
				}

				// Both halves of the global-ingredient switch — the ones turned on and
				// the ones turned off — applied exactly as the review queue applies them.
				await syncGlobalOverwrites(formData);

				// Redirect to the updated recipe page (might have new short_name)
				throw redirect(303, `/${params.recipeLang}/${recipeData.short_name}`);
			} catch (dbError: unknown) {
				return dbFailure(dbError, 'update', recipeData.short_name, formData);
			}
		} catch (error: unknown) {
			return unexpectedFailure(error, 'recipe update');
		}
	}
} satisfies Actions;

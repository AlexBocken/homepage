import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from './$types';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import {
	extractRecipeFromFormData,
	serializeRecipeForDatabase,
	splitClearedFields
} from '$utils/recipeFormHelpers';
import {
	requireRecipeEditor,
	validationFailure,
	saveUploadedImage,
	dbFailure,
	unexpectedFailure
} from '$lib/server/recipeFormAction';

export const load: PageServerLoad = async ({locals, params}) => {
    // Add is German-only - redirect to German version
    if (params.recipeLang === 'recipes') {
        throw redirect(301, '/rezepte/add');
    }

    const session = locals.session ?? await locals.auth();
    return {
		user: session?.user
    };
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const denied = await requireRecipeEditor(locals, 'add');
		if (denied) return denied;

		try {
			const formData = await request.formData();
			console.log('[RecipeAdd] Form data received');

			// Extract recipe data from FormData
			const recipeData = extractRecipeFromFormData(formData);
			console.log('[RecipeAdd] Recipe data extracted:', {
				short_name: recipeData.short_name,
				name: recipeData.name
			});

			const invalid = validationFailure(recipeData, formData, '[RecipeAdd]');
			if (invalid) return invalid;

			// Handle optional image upload
			const recipeImage = formData.get('recipe_image') as File | null;
			console.log('[RecipeAdd] Recipe image from form:', {
				hasImage: !!recipeImage,
				size: recipeImage?.size,
				name: recipeImage?.name,
				type: recipeImage?.type
			});

			if (recipeImage && recipeImage.size > 0) {
				console.log('[RecipeAdd] Starting image processing...');
				const saved = await saveUploadedImage(recipeImage, recipeData.short_name, formData, '[RecipeAdd]');
				if ('failure' in saved) return saved.failure;

				console.log('[RecipeAdd] Image processed successfully, filename:', saved.filename);
				recipeData.images = [{
					mediapath: saved.filename,
					alt: '',
					caption: '',
					blur: saved.blur
				}];
			} else {
				console.log('[RecipeAdd] No image uploaded, using placeholder');
				// No image uploaded - use placeholder based on short_name
				recipeData.images = [{
					mediapath: `${recipeData.short_name}.webp`,
					alt: '',
					caption: ''
				}];
			}

			// Serialize for database. A new recipe has nothing to clear, so only the
			// `set` half is of interest — see splitClearedFields.
			const { set: recipe_json } = splitClearedFields(serializeRecipeForDatabase(recipeData));

			// Connect to database and create recipe
			await dbConnect();

			try {
				await Recipe.create(recipe_json);

				// Redirect to the new recipe page
				throw redirect(303, `/${params.recipeLang}/${recipeData.short_name}`);
			} catch (dbError: unknown) {
				return dbFailure(dbError, 'create', recipeData.short_name, formData);
			}
		} catch (error: unknown) {
			return unexpectedFailure(error, 'recipe');
		}
	}
} satisfies Actions;

/**
 * The parts of the recipe add and edit form actions that the two share: the
 * auth/group guard, the 400 for invalid data, saving an uploaded image, and
 * turning a database or unexpected error into a failure.
 *
 * Every helper that can fail returns the `fail()` to hand back from the action
 * (or null when all is well), so the action reads as a list of early returns.
 */
import { fail, isRedirect, type ActionFailure } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private';
import { processAndSaveRecipeImage } from '$utils/imageProcessing';
import {
	serializableFormValues,
	validateRecipeData,
	type RecipeFormData
} from '$utils/recipeFormHelpers';

/** A failure that refills the form with what was submitted. */
type FormFailure = ActionFailure<{ error: string; errors: string[]; values: Record<string, string> }>;
type AuthFailure = ActionFailure<{ error: string; requiresAuth: boolean }>;
type ErrorFailure = ActionFailure<{ error: string; errors: string[] }>;

/** The message of anything thrown. */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** MongoDB's duplicate-key error (a second recipe with the same short_name). */
export function isDuplicateKeyError(error: unknown): boolean {
	return !!error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000;
}

/** A failure that sends the submitted values back so the form can refill. */
export function formFailure(status: number, error: string, errors: string[], formData: FormData): FormFailure {
	return fail(status, { error, errors, values: serializableFormValues(formData) });
}

/**
 * Authenticate AND authorize. The hook only guards the German `/rezepte/*`
 * path; the `[recipeLang]` matcher also serves the English `/recipes/*` alias,
 * so the group check must live here too — otherwise any logged-in user
 * (regardless of group) could mutate recipes via the English route.
 */
export async function requireRecipeEditor(locals: App.Locals, verb: 'add' | 'edit'): Promise<AuthFailure | null> {
	const auth = locals.session ?? await locals.auth();
	if (!auth?.user?.nickname) {
		return fail(401, {
			error: `You must be logged in to ${verb} recipes`,
			requiresAuth: true
		});
	}
	if (!auth.user.groups?.includes('rezepte_users')) {
		return fail(403, {
			error: `You do not have permission to ${verb} recipes`,
			requiresAuth: true
		});
	}
	return null;
}

/** 400 listing what is missing or wrong, or null when the recipe is valid. */
export function validationFailure(recipeData: RecipeFormData, formData: FormData, logTag = ''): FormFailure | null {
	const validationErrors = validateRecipeData(recipeData);
	if (validationErrors.length === 0) return null;
	if (logTag) console.error(`${logTag} Validation errors:`, validationErrors);
	return formFailure(400, validationErrors.join(', '), validationErrors, formData);
}

/**
 * Processes and saves an uploaded recipe image under the recipe's short name.
 * A processing error becomes a 400 for the form.
 */
export async function saveUploadedImage(
	file: File,
	shortName: string,
	formData: FormData,
	logTag = ''
): Promise<{ filename: string; blur: string } | { failure: FormFailure }> {
	try {
		const { filename, blur } = await processAndSaveRecipeImage(file, shortName, IMAGE_DIR);
		return { filename, blur };
	} catch (imageError: unknown) {
		console.error(`${logTag ? logTag + ' ' : ''}Image processing error:`, imageError);
		return {
			failure: formFailure(
				400,
				`Failed to process image: ${errorMessage(imageError)}`,
				['Image processing failed'],
				formData
			)
		};
	}
}

/**
 * What went wrong while writing the recipe: a redirect is passed on, a
 * duplicate short name is the user's to fix (400), anything else is a 500.
 */
export function dbFailure(
	dbError: unknown,
	verb: 'create' | 'update',
	shortName: string,
	formData: FormData
): FormFailure {
	if (isRedirect(dbError)) throw dbError;

	console.error(`Database error ${verb === 'create' ? 'creating' : 'updating'} recipe:`, dbError);

	if (isDuplicateKeyError(dbError)) {
		return formFailure(
			400,
			`A recipe with the short name "${shortName}" already exists. Please choose a different short name.`,
			['Duplicate short_name'],
			formData
		);
	}

	const dbMessage = errorMessage(dbError);
	return formFailure(500, `Failed to ${verb} recipe: ${dbMessage || 'Unknown database error'}`, [dbMessage], formData);
}

/** Anything else that went wrong: passes a redirect on, otherwise a 500. */
export function unexpectedFailure(error: unknown, what: 'recipe' | 'recipe update'): ErrorFailure {
	if (isRedirect(error)) throw error;

	console.error(what === 'recipe' ? 'Error processing recipe submission:' : 'Error processing recipe update:', error);

	const message = errorMessage(error);
	return fail(500, {
		error: `Failed to process ${what}: ${message || 'Unknown error'}`,
		errors: [message]
	});
}

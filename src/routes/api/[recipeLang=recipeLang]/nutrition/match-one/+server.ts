/**
 * Re-match a single ingredient, and write nothing.
 *
 * "Back to automatic" on one row used to call the whole-recipe generate: twenty
 * ingredients through two embedding models to reset one of them, and the merge
 * that call performs keeps *every* manually edited row, so "reset just this one"
 * could not be expressed — the old code had to clear the row's manual flag first
 * and hope nothing else was in flight.
 *
 * The editor holds unsaved edits to the ingredient line, so `unit` and `amount`
 * may be sent to override what is stored. Everything else — the German and
 * English names — comes from the saved recipe, which is what the matcher needs
 * and what the client has no reason to be trusted for.
 */
import { json, error, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { requireGroup } from '$lib/server/middleware/auth';
import { isEnglish } from '$lib/server/recipeHelpers';
import { matchIngredient } from '$lib/server/nutritionMatcher';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	await requireGroup(locals, 'rezepte_users');
	await dbConnect();

	const body = await request.json().catch(() => null);
	const shortName = typeof body?.shortName === 'string' ? body.shortName : '';
	const sectionIndex = Number(body?.sectionIndex);
	const ingredientIndex = Number(body?.ingredientIndex);
	if (!shortName || !Number.isInteger(sectionIndex) || !Number.isInteger(ingredientIndex)) {
		throw error(400, 'shortName, sectionIndex and ingredientIndex are required');
	}

	const en = isEnglish(params.recipeLang!);
	const query = en ? { 'translations.en.short_name': shortName } : { short_name: shortName };
	const recipe = await Recipe.findOne(query)
		.select('ingredients translations.en.ingredients')
		.lean();
	if (!recipe) throw error(404, 'Recipe not found');

	// A reference section carries no `list` — it stands for another recipe and has
	// no ingredient of its own to match.
	const sectionDe = (recipe.ingredients ?? [])[sectionIndex] as { list?: { name: string; unit?: string; amount?: string }[] } | undefined;
	const itemDe = sectionDe?.list?.[ingredientIndex];
	if (!itemDe) throw error(404, 'Ingredient not found');

	const sectionEn = (recipe.translations?.en?.ingredients ?? [])[sectionIndex] as { list?: { name: string }[] } | undefined;
	const itemEn = sectionEn?.list?.[ingredientIndex];

	const mapping = await matchIngredient(
		itemDe.name,
		itemEn?.name || undefined,
		typeof body.unit === 'string' ? body.unit : itemDe.unit || '',
		typeof body.amount === 'string' ? body.amount : itemDe.amount || '',
		sectionIndex,
		ingredientIndex,
	);

	return json({ mapping });
};

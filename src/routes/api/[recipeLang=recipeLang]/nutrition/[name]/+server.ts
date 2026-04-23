import { json, error, type RequestHandler } from '@sveltejs/kit';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { isEnglish } from '$lib/server/recipeHelpers';
import { getNutritionEntryByFdcId, getBlsEntryByCode, invalidateOverwriteCache } from '$lib/server/nutritionMatcher';
import { NutritionOverwrite } from '$models/NutritionOverwrite';
import { canonicalizeUnit, resolveGramsPerUnit } from '$lib/data/unitConversions';
import type { NutritionMapping } from '$types/types';

/** PATCH: Update individual nutrition mappings (manual edit UI) */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	locals.session ?? await locals.auth();
	await dbConnect();

	const en = isEnglish(params.recipeLang!);
	const query = en
		? { 'translations.en.short_name': params.name }
		: { short_name: params.name };

	const recipe = await Recipe.findOne(query);
	if (!recipe) throw error(404, 'Recipe not found');

	const updates: (Partial<NutritionMapping> & { global?: boolean; ingredientNameDe?: string })[] = await request.json();
	const mappings: any[] = recipe.nutritionMappings || [];

	for (const update of updates) {
		// If global flag is set, also create/update a NutritionOverwrite
		if (update.global && update.ingredientNameDe) {
			const owData: Record<string, any> = {
				ingredientNameDe: update.ingredientNameDe.toLowerCase().trim(),
				source: update.excluded ? 'skip' : (update.source || 'usda'),
				excluded: update.excluded || false,
			};
			if (update.ingredientName) owData.ingredientNameEn = update.ingredientName;
			if (update.fdcId) owData.fdcId = update.fdcId;
			if (update.blsCode) owData.blsCode = update.blsCode;
			if (update.nutritionDbName) owData.nutritionDbName = update.nutritionDbName;

			await NutritionOverwrite.findOneAndUpdate(
				{ ingredientNameDe: owData.ingredientNameDe },
				owData,
				{ upsert: true, runValidators: true },
			);
			invalidateOverwriteCache();
		}

		// Resolve gramsPerUnit from source DB portions if not provided
		if (!update.gramsPerUnit && !update.excluded) {
			if (update.blsCode && update.source === 'bls') {
				update.gramsPerUnit = 1;
				update.unitConversionSource = update.unitConversionSource || 'manual';
			} else if (update.fdcId) {
				const entry = getNutritionEntryByFdcId(update.fdcId);
				if (entry) {
					const resolved = resolveGramsPerUnit('g', entry.portions);
					update.gramsPerUnit = resolved.grams;
					update.unitConversionSource = resolved.source;
				}
			}
		}

		// Clean up non-schema fields before saving
		delete update.global;
		delete update.ingredientNameDe;

		const idx = mappings.findIndex(
			(m: any) => m.sectionIndex === update.sectionIndex && m.ingredientIndex === update.ingredientIndex
		);
		if (idx >= 0) {
			Object.assign(mappings[idx], update, { manuallyEdited: true });
		} else {
			mappings.push({ ...update, manuallyEdited: true });
		}
	}

	recipe.nutritionMappings = mappings;
	await recipe.save();

	return json({ updated: updates.length });
};

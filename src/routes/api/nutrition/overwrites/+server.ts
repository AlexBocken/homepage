import { json, error, type RequestHandler } from '@sveltejs/kit';
import { dbConnect } from '$utils/db';
import { NutritionOverwrite } from '$models/NutritionOverwrite';
import { invalidateOverwriteCache } from '$lib/server/nutritionMatcher';
import { requireAuth } from '$lib/server/middleware/auth';

/** GET: List all global nutrition overwrites */
export const GET: RequestHandler = async ({ locals }) => {
	await requireAuth(locals);
	await dbConnect();
	const overwrites = await NutritionOverwrite.find({}).sort({ ingredientNameDe: 1 }).lean();
	return json(overwrites);
};

/** POST: Create a new global nutrition overwrite */
export const POST: RequestHandler = async ({ request, locals }) => {
	await requireAuth(locals);
	await dbConnect();

	const body = await request.json();
	if (!body.ingredientNameDe || !body.source) {
		throw error(400, 'ingredientNameDe and source are required');
	}

	const data: Record<string, any> = {
		ingredientNameDe: body.ingredientNameDe.toLowerCase().trim(),
		source: body.source,
	};
	if (body.ingredientNameEn) data.ingredientNameEn = body.ingredientNameEn;
	if (body.fdcId) data.fdcId = body.fdcId;
	if (body.blsCode) data.blsCode = body.blsCode;
	if (body.nutritionDbName) data.nutritionDbName = body.nutritionDbName;
	if (body.source === 'skip') data.excluded = true;

	const overwrite = await NutritionOverwrite.findOneAndUpdate(
		{ ingredientNameDe: data.ingredientNameDe },
		data,
		{ upsert: true, returnDocument: 'after', runValidators: true },
	).lean();

	invalidateOverwriteCache();
	return json(overwrite, { status: 201 });
};

/** DELETE: Remove a global nutrition overwrite by ingredientNameDe */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	await requireAuth(locals);
	await dbConnect();

	const body = await request.json();
	if (!body.ingredientNameDe) {
		throw error(400, 'ingredientNameDe is required');
	}

	const result = await NutritionOverwrite.deleteOne({
		ingredientNameDe: body.ingredientNameDe.toLowerCase().trim(),
	});

	invalidateOverwriteCache();
	return json({ deleted: result.deletedCount });
};

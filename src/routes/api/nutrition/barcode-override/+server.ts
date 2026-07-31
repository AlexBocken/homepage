import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { BarcodeNutritionOverride } from '$models/BarcodeNutritionOverride';
import { buildOverrideFood, validateTarget } from '$lib/server/barcodeOverrides';

/**
 * Barcode → BLS/USDA mappings. Global and shared: any logged-in user may set or
 * clear one (hooks.server.ts gates /api/nutrition to a session, no group).
 */

function normaliseCode(raw: string | null | undefined): string | null {
	const code = (raw || '').trim();
	return code.length >= 4 ? code : null;
}

/** GET /api/nutrition/barcode-override?code=… — the current mapping, if any. */
export const GET: RequestHandler = async ({ url }) => {
	const code = normaliseCode(url.searchParams.get('code'));
	if (!code) return json({ error: 'Invalid barcode' }, { status: 400 });

	await dbConnect();
	const doc = await BarcodeNutritionOverride.findOne({ barcode: code }).lean<{
		source: 'bls' | 'usda';
		blsCode?: string;
		fdcId?: number;
		targetName?: string;
		createdByNickname?: string;
	}>();
	if (!doc) return json({ override: null });

	return json({
		override: {
			source: doc.source,
			blsCode: doc.blsCode ?? null,
			fdcId: doc.fdcId ?? null,
			targetName: doc.targetName ?? null,
			createdByNickname: doc.createdByNickname ?? null
		}
	});
};

/**
 * POST /api/nutrition/barcode-override
 * { barcode, source: 'bls'|'usda', blsCode?, fdcId? }
 *
 * Upserts, so re-pointing a barcode is the same call as creating it. Responds
 * with the resolved food so the client can swap what it is showing without a
 * second round trip.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Invalid body' }, { status: 400 });

	const code = normaliseCode(body.barcode);
	if (!code) return json({ error: 'Invalid barcode' }, { status: 400 });

	const target = validateTarget(body.source, body.blsCode, body.fdcId);
	if (!target.ok) return json({ error: target.error }, { status: 400 });

	await dbConnect();
	await BarcodeNutritionOverride.findOneAndUpdate(
		{ barcode: code },
		{
			barcode: code,
			source: target.target.source,
			blsCode: target.target.source === 'bls' ? target.target.blsCode : undefined,
			fdcId: target.target.source === 'usda' ? target.target.fdcId : undefined,
			targetName: target.name,
			createdByNickname: session?.user?.nickname ?? null
		},
		{ upsert: true, new: true, setDefaultsOnInsert: true }
	);

	return json({ food: buildOverrideFood(target.target, code) });
};

/** DELETE /api/nutrition/barcode-override?code=… — back to the OFF entry. */
export const DELETE: RequestHandler = async ({ url }) => {
	const code = normaliseCode(url.searchParams.get('code'));
	if (!code) return json({ error: 'Invalid barcode' }, { status: 400 });

	await dbConnect();
	const res = await BarcodeNutritionOverride.deleteOne({ barcode: code });
	return json({ deleted: res.deletedCount ?? 0 });
};

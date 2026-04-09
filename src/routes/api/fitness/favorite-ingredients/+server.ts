import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FavoriteIngredient } from '$models/FavoriteIngredient';
import { RoundOffCache } from '$models/RoundOffCache';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const favorites = await FavoriteIngredient.find({ createdBy: user.nickname }).lean();
	return json({ favorites });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	const { source, sourceId, name } = await request.json();

	if (!source || !sourceId || !name) {
		return json({ error: 'source, sourceId, and name are required' }, { status: 400 });
	}
	if (source !== 'bls' && source !== 'usda' && source !== 'recipe') {
		return json({ error: 'source must be "bls", "usda", or "recipe"' }, { status: 400 });
	}

	await dbConnect();

	await FavoriteIngredient.findOneAndUpdate(
		{ createdBy: user.nickname, source, sourceId: String(sourceId) },
		{ createdBy: user.nickname, source, sourceId: String(sourceId), name },
		{ upsert: true, returnDocument: 'after' }
	);

	RoundOffCache.deleteMany({ createdBy: user.nickname }).catch(() => {});
	return json({ ok: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	const { source, sourceId } = await request.json();

	if (!source || !sourceId) {
		return json({ error: 'source and sourceId are required' }, { status: 400 });
	}

	await dbConnect();

	await FavoriteIngredient.deleteOne({
		createdBy: user.nickname,
		source,
		sourceId: String(sourceId),
	});

	RoundOffCache.deleteMany({ createdBy: user.nickname }).catch(() => {});
	return json({ ok: true });
};

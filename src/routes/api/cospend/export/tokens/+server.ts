import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types';
import { requireGroup } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { CospendApiToken } from '$models/CospendApiToken';

// Manage the caller's own cospend export tokens. Session + `cospend` group only
// (enforced by requireGroup); the tokens themselves are used on /api/cospend/export.

/** GET: list the caller's tokens (full value included so the panel can show/copy). */
export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireGroup(locals, 'cospend');
	await dbConnect();
	const docs = await CospendApiToken.find({ createdBy: user.nickname.toLowerCase() })
		.sort({ createdAt: -1 })
		.select('token label createdAt lastUsedAt')
		.lean();
	return json({
		tokens: docs.map((d) => ({
			token: d.token,
			label: d.label,
			createdAt: d.createdAt,
			lastUsedAt: d.lastUsedAt ?? null
		}))
	});
};

/** POST: mint a new token. Body: { label? }. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireGroup(locals, 'cospend');
	const body = await request.json().catch(() => ({}));
	const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : '';

	await dbConnect();
	const token = crypto.randomBytes(24).toString('base64url'); // 192-bit, URL-safe
	const doc = await CospendApiToken.create({
		token,
		createdBy: user.nickname.toLowerCase(),
		label
	});
	return json(
		{ token: doc.token, label: doc.label, createdAt: doc.createdAt, lastUsedAt: null },
		{ status: 201 }
	);
};

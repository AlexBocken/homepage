import { json, error } from '@sveltejs/kit';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { FinanceApiToken } from '$models/FinanceApiToken';

// Manage the owner's finance export tokens. Owner session only (the whole
// /api/finances tree is gated on nickname === 'alexander' in hooks.server.ts);
// the tokens themselves are used on /api/finances/export.
const OWNER = 'alexander';

async function requireOwner(locals: App.Locals) {
	const user = await requireAuth(locals);
	if (user.nickname?.toLowerCase() !== OWNER) throw error(403, 'Forbidden');
	return user;
}

/** GET: list the owner's tokens (full value included so the panel can show/copy). */
export const GET: RequestHandler = async ({ locals }) => {
	const user = await requireOwner(locals);
	await dbConnect();
	const docs = await FinanceApiToken.find({ createdBy: user.nickname.toLowerCase() })
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
	const user = await requireOwner(locals);
	const body = await request.json().catch(() => ({}));
	const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : '';

	await dbConnect();
	const token = crypto.randomBytes(24).toString('base64url'); // 192-bit, URL-safe
	const doc = await FinanceApiToken.create({
		token,
		createdBy: user.nickname.toLowerCase(),
		label
	});
	return json(
		{ token: doc.token, label: doc.label, createdAt: doc.createdAt, lastUsedAt: null },
		{ status: 201 }
	);
};

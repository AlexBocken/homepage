/**
 * Handlers for the "manage my export tokens" endpoints
 * (/api/{cospend,finances}/export/tokens and .../tokens/[token]). The two
 * features differ only in which collection holds the tokens and who may manage
 * them; the tokens themselves are checked by ./apiTokenAuth.ts on the export
 * endpoint.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { dbConnect } from '$utils/db';
import type { ApiTokenModel } from '$models/apiToken';
import type { AuthenticatedUser } from '$lib/server/middleware/auth';

type Authorize = (locals: App.Locals) => Promise<AuthenticatedUser>;

/**
 * GET lists the caller's tokens (full value included so the panel can
 * show/copy them); POST mints one from `{ label? }`; DELETE (for the
 * `[token]` route) revokes one of the caller's own. `authorize` throws the
 * 401/403 for callers who may not manage tokens at all.
 */
export function createApiTokenRoutes(model: ApiTokenModel, authorize: Authorize) {
	const GET: RequestHandler = async ({ locals }) => {
		const user = await authorize(locals);
		await dbConnect();
		const docs = await model
			.find({ createdBy: user.nickname.toLowerCase() })
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

	const POST: RequestHandler = async ({ request, locals }) => {
		const user = await authorize(locals);
		const body = await request.json().catch(() => ({}));
		const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : '';

		await dbConnect();
		const token = crypto.randomBytes(24).toString('base64url'); // 192-bit, URL-safe
		const doc = await model.create({
			token,
			createdBy: user.nickname.toLowerCase(),
			label
		});
		return json(
			{ token: doc.token, label: doc.label, createdAt: doc.createdAt, lastUsedAt: null },
			{ status: 201 }
		);
	};

	const DELETE: RequestHandler<{ token: string }> = async ({ params, locals }) => {
		const user = await authorize(locals);
		await dbConnect();
		const res = await model.deleteOne({
			token: params.token,
			createdBy: user.nickname.toLowerCase()
		});
		if (res.deletedCount === 0) return json({ error: 'Not found' }, { status: 404 });
		return json({ ok: true });
	};

	return { GET, POST, DELETE };
}

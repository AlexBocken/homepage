import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { dbConnect } from '$utils/db';
import { PeriodCalendarToken } from '$models/PeriodCalendarToken';
import { PeriodShare } from '$models/PeriodShare';

/**
 * Resolve which user's period data the caller may subscribe to.
 * - No `owner` (or own nickname) → the caller's own tracker.
 * - Another `owner` → only if that user shared their tracker with the caller;
 *   returns the owner's canonical-case nickname (matches PeriodEntry.createdBy).
 * Returns null when the caller is not allowed to access `owner`.
 */
async function resolveDataOwner(nickname: string, owner: string | null): Promise<string | null> {
	if (!owner || owner.toLowerCase() === nickname.toLowerCase()) return nickname;
	const shares = await PeriodShare.find({ sharedWith: nickname.toLowerCase() }).lean();
	const match = shares.find((s) => s.owner.toLowerCase() === owner.toLowerCase());
	return match ? match.owner : null;
}

/** GET: list subscription links for one tracker (own or shared).
 *  - On your OWN tracker you see every link, including ones created by people you
 *    shared it with (you can revoke any of them).
 *  - On someone else's shared tracker you see only the links you created. */
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await requireAuth(locals);
	await dbConnect();

	const dataOwner = await resolveDataOwner(user.nickname, url.searchParams.get('owner'));
	if (!dataOwner) return json({ error: 'Forbidden' }, { status: 403 });

	const isOwner = dataOwner.toLowerCase() === user.nickname.toLowerCase();
	const filter = isOwner
		? { dataOwner }
		: { dataOwner, createdBy: user.nickname.toLowerCase() };

	const docs = await PeriodCalendarToken.find(filter)
		.sort({ createdAt: -1 })
		.select('token label createdAt createdBy')
		.lean();
	return json({
		username: user.nickname,
		dataOwner,
		isOwner,
		subscriptions: docs.map((d) => ({
			token: d.token,
			label: d.label,
			createdAt: d.createdAt,
			createdBy: d.createdBy
		}))
	});
};

/** POST: create a new subscription link. Body: { label?, owner? }. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await requireAuth(locals);
	const body = await request.json().catch(() => ({}));
	const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : '';
	const owner = typeof body.owner === 'string' ? body.owner : null;

	await dbConnect();
	const dataOwner = await resolveDataOwner(user.nickname, owner);
	if (!dataOwner) return json({ error: 'Forbidden' }, { status: 403 });

	const token = crypto.randomBytes(24).toString('base64url'); // 192-bit, URL-safe
	const doc = await PeriodCalendarToken.create({
		token,
		dataOwner,
		createdBy: user.nickname.toLowerCase(),
		label
	});
	return json(
		{
			username: user.nickname,
			dataOwner,
			subscription: { token: doc.token, label: doc.label, createdAt: doc.createdAt, createdBy: doc.createdBy }
		},
		{ status: 201 }
	);
};

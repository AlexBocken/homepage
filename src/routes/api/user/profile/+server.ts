import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { requireSelf, getUser, patchUser } from '$lib/server/authentik';

const MAX_NAME_LENGTH = 150; // matches Authentik's user.name column

/** Read-only account info for the settings page. */
export const GET: RequestHandler = async ({ locals }) => {
	const { pk } = await requireSelf(locals);
	const user = await getUser(pk);
	return json({
		username: user.username,
		name: user.name,
		email: user.email,
		groups: user.groups_obj?.map((g) => g.name) ?? [],
		dateJoined: user.date_joined,
		avatar: user.avatar,
		isActive: user.is_active
	});
};

/** Change the display name. Username is fixed and never accepted here. */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	const { pk } = await requireSelf(locals);

	const body = await request.json().catch(() => null);
	const name = typeof body?.name === 'string' ? body.name.trim() : '';
	if (!name) throw error(400, 'Name darf nicht leer sein.');
	if (name.length > MAX_NAME_LENGTH) throw error(400, `Name darf höchstens ${MAX_NAME_LENGTH} Zeichen lang sein.`);

	await patchUser(pk, { name });
	return json({ ok: true, name });
};

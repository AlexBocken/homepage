import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * User session information extracted from Auth.js
 */
export interface AuthenticatedUser {
	nickname: string;
	name?: string;
	email?: string;
	image?: string;
}

type Session = Awaited<ReturnType<RequestEvent['locals']['auth']>>;

/**
 * Map an Auth.js session to an AuthenticatedUser, or null when the session is
 * missing or has no nickname (the one field every consumer keys on). Nullish
 * profile fields become `undefined` so callers can spread / compare them.
 */
export function toUser(session: Session | null | undefined): AuthenticatedUser | null {
	const user = session?.user;
	if (!user?.nickname) return null;
	return {
		nickname: user.nickname,
		name: user.name ?? undefined,
		email: user.email ?? undefined,
		image: user.image ?? undefined
	};
}

/** The request's session: the one hooks already resolved, else a fresh decode. */
async function getSession(locals: RequestEvent['locals']): Promise<Session> {
	return locals.session ?? await locals.auth();
}

/**
 * Require authentication for an API route.
 * Returns the authenticated user or throws an unauthorized response.
 *
 * @param locals - The RequestEvent locals object containing auth()
 * @returns The authenticated user
 * @throws Response with 401 status if not authenticated
 *
 * @example
 * ```ts
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const user = await requireAuth(locals);
 *   // user.nickname is guaranteed to exist here
 *   return json({ message: `Hello ${user.nickname}` });
 * };
 * ```
 */
export async function requireAuth(
	locals: RequestEvent['locals']
): Promise<AuthenticatedUser> {
	const user = toUser(await getSession(locals));
	if (!user) throw error(401, 'Unauthorized');
	return user;
}

/**
 * Require authentication AND membership in a specific group.
 * Throws 401 if not authenticated, 403 if not in the group.
 */
export async function requireGroup(
	locals: RequestEvent['locals'],
	group: string
): Promise<AuthenticatedUser> {
	const session = await getSession(locals);
	const user = toUser(session);
	if (!user) throw error(401, 'Unauthorized');
	if (!session?.user?.groups?.includes(group)) throw error(403, 'Forbidden');
	return user;
}

/**
 * Optional authentication - returns user if authenticated, null otherwise.
 * Useful for routes that have different behavior for authenticated users.
 *
 * @param locals - The RequestEvent locals object containing auth()
 * @returns The authenticated user or null
 *
 * @example
 * ```ts
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const user = await optionalAuth(locals);
 *   if (user) {
 *     return json({ message: `Hello ${user.nickname}`, isAuthenticated: true });
 *   }
 *   return json({ message: 'Hello guest', isAuthenticated: false });
 * };
 * ```
 */
export async function optionalAuth(
	locals: RequestEvent['locals']
): Promise<AuthenticatedUser | null> {
	return toUser(await getSession(locals));
}

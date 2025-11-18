import { json } from '@sveltejs/kit';
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
	const session = await locals.auth();

	if (!session || !session.user?.nickname) {
		throw json({ error: 'Unauthorized' }, { status: 401 });
	}

	return {
		nickname: session.user.nickname,
		name: session.user.name,
		email: session.user.email,
		image: session.user.image
	};
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
	const session = await locals.auth();

	if (!session || !session.user?.nickname) {
		return null;
	}

	return {
		nickname: session.user.nickname,
		name: session.user.name,
		email: session.user.email,
		image: session.user.image
	};
}

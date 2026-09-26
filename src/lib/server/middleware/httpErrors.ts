import { isHttpError, isRedirect } from '@sveltejs/kit';

/**
 * Re-throw anything SvelteKit's `error()` or `redirect()` produced, so a
 * catch-all around a handler body does not turn a deliberate 400/404 into a
 * 500.
 *
 * Call it first thing in a `catch`. The obvious guard,
 * `e instanceof Error && 'status' in e`, never matches: SvelteKit's HttpError
 * and Redirect are plain classes that do not extend Error.
 */
export function rethrowHttp(e: unknown): void {
	if (isHttpError(e) || isRedirect(e)) throw e;
}

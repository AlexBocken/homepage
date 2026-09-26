import { describe, it, expect } from 'vitest';
import { error, redirect } from '@sveltejs/kit';
import { rethrowHttp } from '$lib/server/middleware/httpErrors';

/** What a handler's `catch (e)` receives when its try block calls fn. */
function caught(fn: () => unknown): unknown {
	try {
		fn();
	} catch (e) {
		return e;
	}
	throw new Error('fn did not throw');
}

describe('rethrowHttp', () => {
	it('rethrows an error() with its status intact', () => {
		const e = caught(() => error(404, 'Recipe not found'));
		expect(() => rethrowHttp(e)).toThrow(expect.objectContaining({ status: 404 }));
	});

	it('rethrows a redirect()', () => {
		const e = caught(() => redirect(303, '/login'));
		expect(() => rethrowHttp(e)).toThrow(expect.objectContaining({ status: 303, location: '/login' }));
	});

	it('lets ordinary errors through to the caller’s 500 path', () => {
		expect(() => rethrowHttp(new Error('db down'))).not.toThrow();
		expect(() => rethrowHttp('boom')).not.toThrow();
		expect(() => rethrowHttp(undefined)).not.toThrow();
		// Looks like an HttpError but is not one.
		expect(() => rethrowHttp({ status: 404, body: { message: 'x' } })).not.toThrow();
	});

	it('covers what the old instanceof Error guard missed', () => {
		const e = caught(() => error(400, 'bad'));
		// The reason this helper exists: HttpError is not an Error.
		expect(e instanceof Error).toBe(false);
		expect(() => rethrowHttp(e)).toThrow();
	});
});

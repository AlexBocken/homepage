import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { FINANCE_SERVICE_URL } from '$env/static/private';
import { requireFinanceOwner } from '$lib/server/middleware/auth';

// Internal beancount JSON API. Bound to localhost on the server; never exposed
// publicly. Inlined at build time from .env, like OCR_SERVICE_URL. This route is
// already gated to the owner in hooks.server.ts; the nickname check here is
// defence-in-depth so the sidecar is never reachable by anyone else.
const BASE = (FINANCE_SERVICE_URL || 'http://127.0.0.1:8091/').replace(/\/+$/, '');

export const GET: RequestHandler = async ({ params, url, locals }) => {
	await requireFinanceOwner(locals);

	const path = params.path ?? '';
	const target = `${BASE}/${path}${url.search}`;

	let res: Response;
	try {
		res = await fetch(target, { headers: { accept: 'application/json' } });
	} catch (err) {
		console.error('finance-service unreachable:', err);
		throw error(503, 'Finance service unavailable');
	}

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error('finance-service error:', res.status, body);
		throw error(res.status === 400 ? 400 : 502, 'Finance service error');
	}

	// Buffer the upstream body into a concrete string rather than streaming
	// `res.body` through. A server `load()` fetches this endpoint during SSR, and
	// SvelteKit then reads the response body a *second* time to inline it into the
	// hydration payload. Teeing a live upstream stream for that second read races
	// under rapid navigation (aborted in-flight requests) and intermittently
	// throws "Body has already been read" → a 500. The sidecar payloads are small
	// (millisecond queries), so materializing them is effectively free and makes
	// the response body safe to read more than once.
	const body = await res.text();
	return new Response(body, {
		status: res.status,
		headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' }
	});
};

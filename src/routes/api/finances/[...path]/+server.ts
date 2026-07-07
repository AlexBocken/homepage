import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { FINANCE_SERVICE_URL } from '$env/static/private';
import { requireAuth } from '$lib/server/middleware/auth';

// Internal beancount JSON API. Bound to localhost on the server; never exposed
// publicly. Inlined at build time from .env, like OCR_SERVICE_URL. This route is
// already gated to the owner in hooks.server.ts; the nickname check here is
// defence-in-depth so the sidecar is never reachable by anyone else.
const BASE = (FINANCE_SERVICE_URL || 'http://127.0.0.1:8091/').replace(/\/+$/, '');
const OWNER = 'alexander';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const user = await requireAuth(locals);
	if (user.nickname?.toLowerCase() !== OWNER) {
		throw error(403, 'Forbidden');
	}

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

	// Pass the JSON straight through.
	return new Response(res.body, {
		status: res.status,
		headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' }
	});
};

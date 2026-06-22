import type { RequestHandler } from '@sveltejs/kit';

// Lightweight reachability probe used by the offline indicator (PWA / Tauri).
// No DB, no auth — just confirms the origin is actually answering. The service
// worker passes /api/ requests straight to the network (never cached), so a
// successful response here means the server is genuinely reachable.
const headers = {
	'Cache-Control': 'no-store, no-cache, must-revalidate',
	'Content-Type': 'text/plain'
};

export const GET: RequestHandler = () => new Response('pong', { status: 200, headers });

export const HEAD: RequestHandler = () => new Response(null, { status: 200, headers });

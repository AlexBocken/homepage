import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { OCR_SERVICE_URL } from '$env/static/private';
import { requireAuth } from '$lib/server/middleware/auth';

// Internal PP-OCR microservice. Inlined at build time from .env, like the rest
// of our config. Bound to localhost on the server; never exposed publicly.
const OCR_URL = OCR_SERVICE_URL || 'http://127.0.0.1:8089/ocr';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireAuth(locals);

	const form = await request.formData();
	const image = form.get('image');
	if (!(image instanceof File)) {
		throw error(400, 'No image provided');
	}
	if (image.size > 12 * 1024 * 1024) {
		throw error(400, 'Image too large');
	}

	const upstream = new FormData();
	upstream.append('image', image, image.name || 'receipt.jpg');

	let res: Response;
	try {
		res = await fetch(OCR_URL, { method: 'POST', body: upstream });
	} catch (err) {
		console.error('OCR service unreachable:', err);
		throw error(503, 'OCR service unavailable');
	}

	if (!res.ok) {
		console.error('OCR service error:', res.status, await res.text().catch(() => ''));
		throw error(502, 'OCR service error');
	}

	return json(await res.json());
};

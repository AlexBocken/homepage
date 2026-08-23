import { error } from '@sveltejs/kit';
import sharp from 'sharp';
import { rateLimit } from '$lib/server/hikesRouting';
import type { RequestHandler } from './$types';

/**
 * Decode one HEIC/HEIF photo into a JPEG the browser can display.
 *
 * Only Safari renders HEIC in an `<img>`, so the route-builder's dropzone can
 * neither thumbnail nor preview an iPhone photo on its own. It posts the file
 * here and gets back a downscaled JPEG. The hash and EXIF it writes into the
 * GPX still come from the ORIGINAL bytes, so the waypoint keeps matching the
 * untouched `.HEIC` the user drops into the hike's `images/` directory — the
 * same file `scripts/build-hikes.ts` will encode later.
 *
 * Requires a sharp that can actually read HEIC: the prebuilt binaries can't
 * (no HEVC decoder), `scripts/sharp-heic.mjs` rebuilds it against the system
 * libvips. Where that isn't available this endpoint 501s and the dropzone
 * reports it per file rather than dying.
 *
 * Deployment note: the request body carries a full-size photo, so the app's
 * `BODY_SIZE_LIMIT` (adapter-node) and nginx's `client_max_body_size` must both
 * clear `MAX_BYTES` — the same requirement the cospend receipt uploads have.
 */

// Comfortably above an iPhone HEIC (~2–4 MB) without inviting arbitrary uploads.
const MAX_BYTES = 30 * 1024 * 1024;

// Wide enough to stay sharp as the waypoint panel's full preview; the 360w
// thumbnail is downscaled from it client-side.
const PREVIEW_WIDTH = 1600;

// Generous and on its own key prefix: importing a day of photos is the normal
// case here, and each request is one decode. A shared budget would let a bulk
// import starve the routing endpoint.
const RATE_LIMIT_PER_MIN = 120;

const SHARP_READS_HEIC = sharp.format.heif.input.fileSuffix?.includes('.heic') ?? false;

// ISO-BMFF brands that mean "HEIF-family still image". `ftyp` sits at bytes
// 4..8, the major brand right after it. Checked on the bytes rather than the
// client's Content-Type, which is empty for `.HEIC` on several platforms.
const HEIF_BRANDS = new Set([
	'heic',
	'heix',
	'heim',
	'heis',
	'hevc',
	'hevx',
	'hevm',
	'hevs',
	'mif1',
	'msf1'
]);

function isHeif(buf: Buffer): boolean {
	if (buf.length < 12) return false;
	if (buf.toString('latin1', 4, 8) !== 'ftyp') return false;
	return HEIF_BRANDS.has(buf.toString('latin1', 8, 12));
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user) throw error(401, 'Anmeldung erforderlich');

	if (!SHARP_READS_HEIC) {
		throw error(501, 'Server kann HEIC nicht dekodieren (sharp ohne HEVC-Unterstützung)');
	}

	const rateKey = session.user.nickname ?? session.user.email ?? getClientAddress();
	const { ok, retryAfter } = rateLimit(`heic:${rateKey}`, RATE_LIMIT_PER_MIN);
	if (!ok) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(retryAfter ?? 60)
			}
		});
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		throw error(400, 'Ungültiger Request-Body');
	}

	const image = form.get('image');
	if (!(image instanceof File)) throw error(400, 'Kein Bild übermittelt');
	if (image.size === 0) throw error(400, 'Leere Datei');
	if (image.size > MAX_BYTES) throw error(413, 'Bild zu gross');

	const buffer = Buffer.from(await image.arrayBuffer());
	if (!isHeif(buffer)) throw error(415, 'Keine HEIC/HEIF-Datei');

	let jpeg: Buffer;
	try {
		jpeg = await sharp(buffer)
			// Orientation is baked into the pixels here — the client only ever
			// sees this JPEG, and canvas ignores the EXIF orientation tag.
			.rotate()
			.resize({ width: PREVIEW_WIDTH, withoutEnlargement: true })
			.jpeg({ quality: 82 })
			.toBuffer();
	} catch (err) {
		console.error('[heic-preview] decode failed:', err);
		throw error(422, 'HEIC konnte nicht dekodiert werden');
	}

	return new Response(new Uint8Array(jpeg), {
		status: 200,
		headers: {
			'Content-Type': 'image/jpeg',
			'Content-Length': String(jpeg.byteLength),
			// Purely a rendering aid for the current editing session.
			'Cache-Control': 'no-store'
		}
	});
};

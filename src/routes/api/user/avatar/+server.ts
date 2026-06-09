import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { IMAGE_DIR } from '$env/static/private';
import sharp from 'sharp';
import { generateImageHashFromBuffer } from '$utils/imageHash';
import { validateImageBuffer } from '$utils/imageValidation';
import { requireSelf, getUser, patchUser } from '$lib/server/authentik';

// Avatars are written under IMAGE_DIR/user/{full,thumb}/{nickname}.webp, which
// nginx already serves publicly at this origin. The absolute URL is what other
// SSO apps load, so it must point at the public host, not the dev origin.
const STATIC_BASE = 'https://bocken.org';
const FULL_SIZE = 2000;
const THUMB_SIZE = 128;

/** Upload a (client-cropped) avatar, store it, and propagate it to Authentik. */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { pk, nickname } = await requireSelf(locals);

	// Defence in depth: nickname becomes a filesystem path component. Authentik
	// usernames are normally safe, but reject anything that could traverse.
	if (!/^[a-zA-Z0-9._-]+$/.test(nickname)) {
		throw error(400, 'Benutzername enthält ungültige Zeichen für einen Dateinamen.');
	}

	const form = await request.formData();
	const image = form.get('image');
	if (!(image instanceof File)) throw error(400, 'Kein Bild übermittelt.');

	const buffer = Buffer.from(await image.arrayBuffer());
	const validation = await validateImageBuffer(buffer, 'avatar.webp');
	if (!validation.valid) throw error(400, validation.error || 'Ungültige Bilddatei.');

	// Force a square avatar regardless of the submitted crop. FULL_SIZE is a cap
	// (withoutEnlargement) — smaller source crops are kept at native resolution
	// rather than upscaled into a blurry 2000px image.
	const fullBuffer = await sharp(buffer)
		.resize(FULL_SIZE, FULL_SIZE, { fit: 'cover', withoutEnlargement: true })
		.webp({ quality: 90 })
		.toBuffer();
	const thumbBuffer = await sharp(buffer)
		.resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
		.webp({ quality: 85 })
		.toBuffer();

	const fullDir = path.join(IMAGE_DIR, 'user', 'full');
	const thumbDir = path.join(IMAGE_DIR, 'user', 'thumb');
	await mkdir(fullDir, { recursive: true });
	await mkdir(thumbDir, { recursive: true });

	// Write each size under both a stable name — referenced cross-user by username
	// (e.g. cospend, where another user's content hash is unknown) — and a
	// content-hashed name, which is immutable and therefore reliably cache-busted.
	// Our own avatar uses the hashed URL (via Authentik's attributes.avatar.url);
	// other users' avatars fall back to the stable name.
	const hash = generateImageHashFromBuffer(fullBuffer);
	const stableName = `${nickname}.webp`;
	const hashedName = `${nickname}-${hash}.webp`;
	await Promise.all([
		writeFile(path.join(fullDir, stableName), fullBuffer),
		writeFile(path.join(fullDir, hashedName), fullBuffer),
		writeFile(path.join(thumbDir, stableName), thumbBuffer),
		writeFile(path.join(thumbDir, hashedName), thumbBuffer)
	]);

	const avatarUrl = `${STATIC_BASE}/static/user/full/${hashedName}`;

	// Authentik replaces the whole attributes object on PATCH — read first, then
	// merge so we don't clobber other attributes. Stored as { url } to match the
	// Authentik avatar source `attributes.avatar.url`, so the uploaded (hashed,
	// cache-busted) image is used over gravatar.
	const current = await getUser(pk);
	await patchUser(pk, { attributes: { ...current.attributes, avatar: { url: avatarUrl } } });

	return json({ ok: true, avatar: avatarUrl });
};

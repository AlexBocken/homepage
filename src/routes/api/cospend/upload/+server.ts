import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { IMAGE_DIR } from '$env/static/private';
import { requireAuth } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
  await requireAuth(locals);

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      throw error(400, 'No image provided');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      throw error(400, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    if (image.size > 10 * 1024 * 1024) {
      throw error(400, 'File too large. Maximum size is 10MB.');
    }

    if (!IMAGE_DIR) {
      throw error(500, 'IMAGE_DIR environment variable not configured');
    }

    // Decode the whole upload with sharp and re-encode it, rather than writing the
    // client's bytes to disk: a file claiming image/png but holding anything else
    // fails here, and what lands on disk is always an image we produced. Also
    // strips EXIF (GPS etc.) and bakes the orientation in.
    const input = Buffer.from(await image.arrayBuffer());
    let format: string | undefined;
    try {
      ({ format } = await sharp(input, { failOn: 'error' }).metadata());
    } catch {
      format = undefined;
    }
    if (!format || !['jpeg', 'png', 'webp'].includes(format)) {
      throw error(400, 'File is not a valid JPEG, PNG or WebP image.');
    }

    const filename = `${randomUUID()}.webp`;

    // Ensure cospend directory exists in IMAGE_DIR
    const uploadsDir = join(IMAGE_DIR, 'cospend');
    mkdirSync(uploadsDir, { recursive: true });

    // Receipts are read for their small print (and re-scanned), so keep the
    // resolution generous and the quality high: 2560 px on the long edge reads
    // thermal-paper text cleanly, and WebP q85 keeps edges crisp while costing
    // far less than the phone's JPEG (mostly-white paper compresses well).
    let full: Buffer;
    try {
      full = await sharp(input, { failOn: 'error' })
        .rotate()
        .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 5 })
        .toBuffer();
    } catch {
      throw error(400, 'Could not process image.');
    }
    writeFileSync(join(uploadsDir, filename), full);

    // Downscaled thumbnail for list views (payments overview), stored under
    // cospend/thumb/ with the same filename. Best-effort: a thumbnail failure
    // must never fail the upload.
    try {
      const thumbDir = join(uploadsDir, 'thumb');
      mkdirSync(thumbDir, { recursive: true });
      const thumbBytes = await sharp(full)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      writeFileSync(join(thumbDir, filename), thumbBytes);
    } catch (thumbErr) {
      console.error('Receipt thumbnail generation failed (full image kept):', thumbErr);
    }

    // Store just the filename; the URL is constructed at display time.
    return json({
      success: true,
      path: filename
    });

  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) throw err;
    console.error('Upload error:', err);
    throw error(500, 'Failed to upload file');
  }
};
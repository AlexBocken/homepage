import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { IMAGE_DIR } from '$env/static/private';

export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = locals.session ?? await locals.auth();
  if (!auth || !auth.user?.nickname) {
    throw error(401, 'Not logged in');
  }

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

    if (image.size > 5 * 1024 * 1024) {
      throw error(400, 'File too large. Maximum size is 5MB.');
    }

    const extension = image.type.split('/')[1];
    const filename = `${randomUUID()}.${extension}`;
    
    if (!IMAGE_DIR) {
      throw error(500, 'IMAGE_DIR environment variable not configured');
    }
    
    // Ensure cospend directory exists in IMAGE_DIR
    const uploadsDir = join(IMAGE_DIR, 'cospend');
    try {
      mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    const filepath = join(uploadsDir, filename);
    const buffer = await image.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    writeFileSync(filepath, bytes);

    // Generate a downscaled thumbnail for list views (payments overview),
    // stored under cospend/thumb/ with the SAME filename + format as the full
    // image. Best-effort: a thumbnail failure must never fail the upload.
    try {
      const thumbDir = join(uploadsDir, 'thumb');
      mkdirSync(thumbDir, { recursive: true });
      const thumbBytes = await sharp(bytes)
        .rotate() // bake EXIF orientation so the thumbnail isn't sideways
        .resize({ width: 400, withoutEnlargement: true })
        .toBuffer(); // keeps the input format, so the filename/extension stay valid
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
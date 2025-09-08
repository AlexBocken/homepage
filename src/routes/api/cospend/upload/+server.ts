import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { IMAGE_DIR } from '$env/static/private';

export const POST: RequestHandler = async ({ request, locals }) => {
  const auth = await locals.auth();
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
    
    writeFileSync(filepath, new Uint8Array(buffer));
    
    const publicPath = `/cospend/${filename}`;
    
    return json({
      success: true,
      path: publicPath
    });

  } catch (err) {
    if (err.status) throw err;
    console.error('Upload error:', err);
    throw error(500, 'Failed to upload file');
  }
};
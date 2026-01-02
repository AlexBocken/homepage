# Image Hash Migration Guide

This guide explains how to migrate existing images to use content-based hashing for cache invalidation.

## Overview

The new system stores images with content-based hashes for proper cache invalidation:
- **Database**: `images[0].mediapath = "maccaroni.a1b2c3d4.webp"`
- **Disk (hashed)**: `maccaroni.a1b2c3d4.webp` - cached forever (immutable)
- **Disk (unhashed)**: `maccaroni.webp` - fallback for graceful degradation

## What This Does

The migration will:

1. **Find all recipes** in the database
2. **Check each recipe's images**:
   - If `images[0].mediapath` already has a hash → skip
   - If image file doesn't exist on disk → skip
   - Otherwise → generate hash and create hashed copy
3. **Generate content hash** from the full-size image (8-char SHA-256)
4. **Copy files** (keeps originals!) in all three directories:
   - `/var/lib/www/static/rezepte/full/`
   - `/var/lib/www/static/rezepte/thumb/`
   - `/var/lib/www/static/rezepte/placeholder/`
5. **Update database** with new hashed filename in `images[0].mediapath`

## Prerequisites

- **Authentication**: Either be logged in as admin OR have `ADMIN_SECRET_TOKEN` set
- Only runs in production (when `IMAGE_DIR=/var/lib/www/static`)
- Requires confirmation token to prevent accidental runs
- Backup your database before running (recommended)

### Setting Up Admin Token (Production Server)

Add `ADMIN_SECRET_TOKEN` to your production `.env` file:

```bash
# Generate a secure random token
openssl rand -hex 32

# Add to .env (production only!)
echo "ADMIN_SECRET_TOKEN=your-generated-token-here" >> .env
```

**Important**: Keep this token secret and only set it on the production server. Do NOT commit it to git.

## Step 1: Deploy Code Changes

Deploy the updated codebase to production. The changes include:
- Image upload endpoint now saves both hashed and unhashed versions
- Frontend components use `images[0].mediapath` for image URLs
- New migration endpoint at `/api/admin/migrate-image-hashes`

## Step 2: Update Nginx Configuration

Add this to your nginx site configuration for `bocken.org`:

```nginx
location /static/rezepte/ {
    root /var/lib/www;

    # Cache hashed files forever (they have content hash in filename)
    location ~ /static/rezepte/(thumb|placeholder|full)/[^/]+\.[a-f0-9]{8}\.webp$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Cache unhashed files with revalidation (fallback for manual uploads)
    location ~ /static/rezepte/(thumb|placeholder|full)/[^/]+\.webp$ {
        add_header Cache-Control "public, max-age=3600, must-revalidate";
    }
}
```

Reload nginx:
```bash
sudo nginx -t && sudo nginx -s reload
```

## Step 3: Run Migration

### Option 1: Using Shell Script (Recommended for Server)

SSH into your production server and run:

```bash
cd /path/to/homepage

# Source your .env to get ADMIN_SECRET_TOKEN
source .env

# Make script executable (first time only)
chmod +x scripts/migrate-image-hashes.sh

# Run migration
./scripts/migrate-image-hashes.sh
```

The script will:
- Check that `ADMIN_SECRET_TOKEN` is set
- Ask for confirmation
- Call the API endpoint with the admin token
- Pretty-print the results

### Option 2: Using curl with Admin Token

```bash
# On production server with .env sourced
source .env

curl -X POST https://bocken.org/api/admin/migrate-image-hashes \
  -H "Content-Type: application/json" \
  -d "{\"confirm\": \"MIGRATE_IMAGES\", \"adminToken\": \"$ADMIN_SECRET_TOKEN\"}"
```

### Option 3: Using curl with Session Cookie (Browser)

```bash
# Get your session cookie from browser DevTools
# In Chrome/Firefox: F12 → Network tab → Click any request → Headers → Copy Cookie value

curl -X POST https://bocken.org/api/admin/migrate-image-hashes \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE_HERE" \
  -d '{"confirm": "MIGRATE_IMAGES"}'
```

### Option 4: Using Browser (Postman, Insomnia, etc.)

1. Make sure you're logged in to bocken.org in your browser
2. Send POST request to: `https://bocken.org/api/admin/migrate-image-hashes`
3. Headers:
   ```
   Content-Type: application/json
   ```
4. Body (JSON):
   ```json
   {
     "confirm": "MIGRATE_IMAGES"
   }
   ```

## Response Format

Success response:
```json
{
  "success": true,
  "message": "Migration complete. Migrated 42 of 100 recipes.",
  "total": 100,
  "migrated": 42,
  "skipped": 58,
  "errors": [],
  "details": [
    {
      "shortName": "maccaroni",
      "status": "migrated",
      "unhashedFilename": "maccaroni.webp",
      "hashedFilename": "maccaroni.a1b2c3d4.webp",
      "hash": "a1b2c3d4",
      "filesCopied": 3,
      "note": "Both hashed and unhashed versions saved for graceful degradation"
    },
    {
      "shortName": "pizza",
      "status": "skipped",
      "reason": "already hashed",
      "filename": "pizza.e5f6g7h8.webp"
    }
  ]
}
```

## What Gets Skipped

The migration will skip recipes where:
- `images[0].mediapath` already contains a hash pattern (`.[a-f0-9]{8}.webp`)
- Image file doesn't exist on disk
- Recipe has no images array

## After Migration

### Verification

1. Check a few recipe pages - images should load correctly
2. Check browser DevTools → Network tab:
   - Hashed images should have `Cache-Control: max-age=31536000, immutable`
   - Unhashed images should have `Cache-Control: max-age=3600, must-revalidate`

### New Uploads

All new image uploads will automatically:
- Generate content hash
- Save both hashed and unhashed versions
- Store hashed filename in database
- Work immediately with proper cache invalidation

### Manual Uploads

If you manually upload an image:
1. Drop `recipe-name.webp` in all three folders (full, thumb, placeholder)
2. It will work immediately (graceful degradation)
3. Next time the recipe is edited and image re-uploaded, it will get a hash

## Rollback (If Needed)

If something goes wrong:

1. **Database rollback**: Restore from backup taken before migration
2. **Files**: The original unhashed files are still on disk - no data loss
3. **Remove hashed files** (optional):
   ```bash
   cd /var/lib/www/static/rezepte
   find . -name '*.[a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9].webp' -delete
   ```

## Safety Features

1. ✅ **Production-only**: Won't run unless `IMAGE_DIR=/var/lib/www/static`
2. ✅ **Confirmation token**: Requires `{"confirm": "MIGRATE_IMAGES"}` in request body
3. ✅ **Authentication**: Requires either logged-in user OR valid `ADMIN_SECRET_TOKEN`
4. ✅ **Non-destructive**: Copies files (keeps originals)
5. ✅ **Skip already migrated**: Won't re-process files that already have hashes
6. ✅ **Detailed logging**: Returns detailed report of what was changed

## Technical Details

### Hash Generation

- Uses SHA-256 of image file content
- First 8 hex characters used (4 billion combinations)
- Same image = same hash (deterministic)
- Different image = different hash (cache invalidation)

### File Structure

```
/var/lib/www/static/rezepte/
├── full/
│   ├── maccaroni.webp           ← Unhashed (fallback)
│   ├── maccaroni.a1b2c3d4.webp  ← Hashed (cache busting)
│   └── ...
├── thumb/
│   ├── maccaroni.webp
│   ├── maccaroni.a1b2c3d4.webp
│   └── ...
└── placeholder/
    ├── maccaroni.webp
    ├── maccaroni.a1b2c3d4.webp
    └── ...
```

### Database Schema

```typescript
images: [{
  mediapath: "maccaroni.a1b2c3d4.webp",  // Full filename with hash
  alt: "Maccaroni and cheese",
  caption: "Delicious comfort food"
}]
```

### Frontend Usage

```svelte
<!-- Card.svelte -->
<script>
  // Uses images[0].mediapath (with hash)
  // Falls back to short_name.webp if missing
  const img_name = $derived(
    recipe.images?.[0]?.mediapath ||
    `${recipe.short_name}.webp`
  );
</script>

<img src="https://bocken.org/static/rezepte/thumb/{img_name}" />
```

## Questions?

If you encounter issues:
1. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Check application logs for the migration endpoint
3. Verify file permissions on `/var/lib/www/static/rezepte/`
4. Ensure database connection is working

The migration is designed to be safe and non-destructive. Original files are never deleted, only copied.

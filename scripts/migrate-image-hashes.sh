#!/bin/bash

# Image Hash Migration Script
# This script triggers the image hash migration endpoint in production
# It will:
# 1. Find all images without hashes (shortname.webp)
# 2. Generate content hashes for them
# 3. Rename them to shortname.{hash}.webp
# 4. Update the database

set -e

echo "======================================"
echo "Image Hash Migration Script"
echo "======================================"
echo ""
echo "This will migrate all existing images to use content-based hashes."
echo "Images will be renamed from 'shortname.webp' to 'shortname.{hash}.webp'"
echo ""
echo "⚠️  WARNING: This operation will rename files on disk!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Starting migration..."
echo ""

# Get the production URL (modify this to your production URL)
PROD_URL="https://bocken.org"

# Make the API call
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: $(cat .prod-session-cookie 2>/dev/null || echo '')" \
    -d '{"confirm": "MIGRATE_IMAGES"}' \
    "${PROD_URL}/api/admin/migrate-image-hashes")

# Pretty print the response
echo "$response" | jq '.'

echo ""
echo "======================================"
echo "Migration complete!"
echo "======================================"

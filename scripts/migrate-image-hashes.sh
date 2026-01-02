#!/bin/bash

# Image Hash Migration Script
# This script triggers the image hash migration endpoint in production
# It will:
# 1. Find all images without hashes (shortname.webp)
# 2. Generate content hashes for them
# 3. Copy them to shortname.{hash}.webp (keeps originals)
# 4. Update the database

set -e

echo "======================================"
echo "Image Hash Migration Script"
echo "======================================"
echo ""
echo "This will migrate all existing images to use content-based hashes."
echo "Images will be copied from 'shortname.webp' to 'shortname.{hash}.webp'"
echo "Original unhashed files will be kept for graceful degradation."
echo ""
echo "⚠️  WARNING: This operation will modify the database and create new files!"
echo ""

# Check for admin token
if [ -z "$ADMIN_SECRET_TOKEN" ]; then
    echo "Error: ADMIN_SECRET_TOKEN environment variable not set."
    echo ""
    echo "Please set it first:"
    echo "  export ADMIN_SECRET_TOKEN='your-secret-token'"
    echo ""
    echo "Or source your .env file:"
    echo "  source .env"
    exit 1
fi

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Starting migration..."
echo ""

# Get the production URL (modify this to your production URL)
PROD_URL="${PROD_URL:-https://bocken.org}"

# Make the API call with admin token
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"confirm\": \"MIGRATE_IMAGES\", \"adminToken\": \"$ADMIN_SECRET_TOKEN\"}" \
    "${PROD_URL}/api/admin/migrate-image-hashes")

# Pretty print the response
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "======================================"
echo "Migration complete!"
echo "======================================"

import crypto from 'crypto';
import fs from 'fs';

/**
 * Generates an 8-character hash from image file content
 * Uses SHA-256 for reliable, content-based hashing
 * @param filePath - Path to the image file
 * @returns 8-character hex hash
 */
export function generateImageHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const hash = hashSum.digest('hex');
  return hash.substring(0, 8);
}

/**
 * Generates an 8-character hash from Buffer content
 * @param buffer - Image file buffer
 * @returns 8-character hex hash
 */
export function generateImageHashFromBuffer(buffer: Buffer): string {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(buffer);
  const hash = hashSum.digest('hex');
  return hash.substring(0, 8);
}

/**
 * Creates a filename with hash for cache busting
 * @param basename - Base name without extension (e.g., "maccaroni")
 * @param hash - 8-character hash
 * @returns Filename with hash (e.g., "maccaroni.a1b2c3d4.webp")
 */
export function getHashedFilename(basename: string, hash: string): string {
  return `${basename}.${hash}.webp`;
}

/**
 * Extracts basename from a potentially hashed filename
 * @param filename - Filename (e.g., "maccaroni.a1b2c3d4.webp" or "maccaroni.webp")
 * @returns Basename without hash or extension (e.g., "maccaroni")
 */
export function extractBasename(filename: string): string {
  // Remove .webp extension
  const withoutExt = filename.replace(/\.webp$/, '');
  // Remove hash if present (8 hex chars preceded by a dot)
  return withoutExt.replace(/\.[a-f0-9]{8}$/, '');
}

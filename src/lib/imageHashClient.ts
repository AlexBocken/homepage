/**
 * Compute the same 8-hex-char short content hash that `src/utils/imageHash.ts`
 * produces server-side. The shared format lets the route-builder embed image
 * refs in GPX files (`<wpt>` extensions) that the build script can match back
 * to image files in the hike content directory.
 *
 * Format: SHA-256 of the full file buffer, first 4 bytes rendered as lowercase
 * hex → 8 characters.
 */
export async function generateImageHashClient(file: Blob): Promise<string> {
	const buf = await file.arrayBuffer();
	const digest = await crypto.subtle.digest('SHA-256', buf);
	const view = new Uint8Array(digest, 0, 4);
	return Array.from(view, (b) => b.toString(16).padStart(2, '0')).join('');
}

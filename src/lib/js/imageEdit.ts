/**
 * Client-side image editing pipeline (no DOM / Svelte deps).
 *
 * The browser already ships a WebP encoder via `canvas.toBlob(cb, 'image/webp', q)`.
 * Crop, scale-to-fit and the size readout are built on top of `<canvas>`; the
 * encode is the only primitive we don't hand-roll. `sharp` cannot run here — it's
 * a native Node binding — so all of this happens on the main thread.
 */

export type CropRect = { x: number; y: number; w: number; h: number };
export type Size = { w: number; h: number };

/**
 * Decode a File into an ImageBitmap, honouring EXIF orientation so that
 * sideways phone photos render upright.
 */
export async function loadBitmap(file: File): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		// Older Safari ignores the options bag — fall back to the plain call.
		return await createImageBitmap(file);
	}
}

/**
 * Scale `w`×`h` to fit inside a `max`×`max` box, preserving aspect ratio.
 * Never upscales (a smaller source is returned untouched). `max <= 0` means
 * "no limit" (Original).
 */
export function fitWithin(w: number, h: number, max: number): Size {
	if (max <= 0 || (w <= max && h <= max)) {
		return { w: Math.round(w), h: Math.round(h) };
	}
	const scale = Math.min(max / w, max / h);
	return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/**
 * Crop `bitmap` to `crop` (source pixels), scale the result to fit `maxRes`,
 * and encode as WebP at `quality` (1–100). Returns the encoded Blob; read
 * `.size` for the final byte count.
 */
export async function renderToBlob(
	bitmap: ImageBitmap,
	crop: CropRect,
	maxRes: number,
	quality: number
): Promise<Blob> {
	const out = fitWithin(crop.w, crop.h, maxRes);
	const canvas = document.createElement('canvas');
	canvas.width = out.w;
	canvas.height = out.h;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas context unavailable');
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, out.w, out.h);

	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('WebP encoding failed'))),
			'image/webp',
			Math.min(1, Math.max(0.01, quality / 100))
		);
	});
}

/** Wrap an encoded Blob as a File the form can upload. */
export function blobToFile(blob: Blob, shortName: string): File {
	const base = (shortName || 'image').trim() || 'image';
	return new File([blob], `${base}.webp`, { type: 'image/webp' });
}

/** Human-readable byte size, e.g. "412 KB" / "1.3 MB". */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

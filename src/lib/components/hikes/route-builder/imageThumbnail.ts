/**
 * Render a WebP data-URL preview of an image file using the browser's canvas.
 * 360px wide — large enough to serve as a full-width preview in the waypoint
 * table while still being a sane base64 payload (~30 KB) for localStorage.
 * The marker badge on the map (56×56) downsamples it cleanly.
 */
const PREVIEW_WIDTH = 360;

export async function readThumbnail(file: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = () => {
				const w = Math.min(PREVIEW_WIDTH, img.width || PREVIEW_WIDTH);
				const ratio = img.width / img.height || 1;
				const h = Math.round(w / ratio);
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('canvas 2d unavailable'));
					return;
				}
				ctx.drawImage(img, 0, 0, w, h);
				resolve(canvas.toDataURL('image/webp', 0.7));
			};
			img.onerror = () => reject(new Error('Konnte Bild nicht laden'));
			img.src = reader.result as string;
		};
		reader.onerror = () => reject(new Error('Konnte Datei nicht lesen'));
		reader.readAsDataURL(file);
	});
}

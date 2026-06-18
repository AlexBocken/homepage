// Receipt OCR via the server-side PP-OCR microservice (proxied through
// /api/cospend/ocr). The browser only resizes the photo before upload — no
// brittle client-side thresholding — so scan quality no longer depends on
// per-camera tuning; the learned model handles the variability.

export interface ReceiptBox {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export interface ReceiptLine {
	text: string;
	/** Parsed money amount on this line, if any (e.g. 12.50). */
	price: number | null;
	/** Axis-aligned bounding box in the (resized) image's pixel coordinates. */
	bbox: ReceiptBox;
}

/** A line assigned to a user, with its box stored as 0..1 image fractions. */
export interface ReceiptAnnotationItem {
	box: ReceiptBox;
	user: string;
	amount: number;
}

/** Persisted receipt selections — boxes are fractions of the image (0..1). */
export interface ReceiptAnnotations {
	totalBox: ReceiptBox | null;
	items: ReceiptAnnotationItem[];
}

export interface ReceiptScan {
	lines: ReceiptLine[];
	total: number | null;
	/** Bounding box of the line the total came from (for highlighting on the image). */
	totalBox: ReceiptBox | null;
	/** Width/height of the image the boxes are relative to. */
	width: number;
	height: number;
	rawText: string;
}

interface OcrServiceLine {
	text: string;
	box: [number, number, number, number];
	confidence: number;
}

const MONEY_TOKEN = /\d[\d'’. ]*[.,]\d{2}/g;
const TOTAL_RE = /\b(total|summe|gesamt\w*|betrag|zu\s*zahlen|to\s*pay|amount\s*due)\b/i;
const EXCLUDE_RE =
	/(subtotal|zwischensumme|mwst|mehrwertsteuer|\bvat\b|\btva\b|\btax\b|rückgeld|ruckgeld|change|gegeben|\bcash\b|\bbar\b|twint|karte|\bcard\b|trinkgeld|\btip\b|rabatt|saldo|gutschein)/i;

/** Parse the last money-looking token on a line into a number. */
export function parsePrice(text: string): number | null {
	const matches = text.match(MONEY_TOKEN);
	if (!matches || matches.length === 0) return null;
	const token = matches[matches.length - 1].trim();
	const dec = token.match(/[.,](\d{2})$/);
	if (!dec) return null;
	const intPart = token.slice(0, token.length - 3).replace(/\D/g, '');
	const value = parseFloat(`${intPart || '0'}.${dec[1]}`);
	return Number.isFinite(value) ? value : null;
}

/** Pick the line that best represents the grand total, or null. */
function detectTotalLine(lines: ReceiptLine[]): ReceiptLine | null {
	const priced = lines.filter((l) => l.price !== null && !EXCLUDE_RE.test(l.text));
	const labelled = priced.filter((l) => TOTAL_RE.test(l.text));
	const pool = labelled.length > 0 ? labelled : priced;
	if (pool.length === 0) return null;
	return pool.reduce((best, l) => ((l.price as number) > (best.price as number) ? l : best));
}

/** Downscale (never upscale) the photo to bound upload size and server work. */
async function resizeForUpload(file: File, maxSide = 1920): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const longSide = Math.max(bitmap.width, bitmap.height);
	const scale = Math.min(1, maxSide / longSide);
	const w = Math.round(bitmap.width * scale);
	const h = Math.round(bitmap.height * scale);

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close?.();
		return file;
	}
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close?.();

	return new Promise<Blob>((resolve) =>
		canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.9)
	);
}

/** Run OCR on a receipt image (server-side) and return lines + a best-guess total. */
export async function scanReceipt(file: File): Promise<ReceiptScan> {
	const blob = await resizeForUpload(file);

	const form = new FormData();
	form.append('image', blob, 'receipt.jpg');

	const res = await fetch('/api/cospend/ocr', { method: 'POST', body: form });
	if (!res.ok) throw new Error(`OCR request failed (${res.status})`);

	const data: { lines: OcrServiceLine[]; width: number; height: number } = await res.json();

	const lines: ReceiptLine[] = (data.lines ?? []).map((l) => ({
		text: l.text.replace(/\s+/g, ' ').trim(),
		price: parsePrice(l.text),
		bbox: { x0: l.box[0], y0: l.box[1], x1: l.box[2], y1: l.box[3] }
	}));

	const totalLine = detectTotalLine(lines);

	// Debug: dump every scanned line and the chosen total line to the console
	console.groupCollapsed(`[receipt OCR] ${lines.length} lines`);
	lines.forEach((l, i) => {
		console.log(
			`${String(i).padStart(2, '0')}  ${l.price != null ? l.price.toFixed(2).padStart(9) : '        —'}  ${l.text}`
		);
	});
	console.log(
		'%c[receipt OCR] total →',
		'font-weight:bold',
		totalLine ? `${totalLine.price?.toFixed(2)}  «${totalLine.text}»` : 'none detected'
	);
	console.groupEnd();

	return {
		lines,
		total: totalLine?.price ?? null,
		totalBox: totalLine?.bbox ?? null,
		width: data.width,
		height: data.height,
		rawText: lines.map((l) => l.text).join('\n')
	};
}

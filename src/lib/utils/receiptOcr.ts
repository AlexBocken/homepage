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
	/** Parsed money amount on this line, if any (e.g. 12.50); negative for deductions. */
	price: number | null;
	/** Axis-aligned bounding box in the (resized) image's pixel coordinates. */
	bbox: ReceiptBox;
	/** Printed text height in pixels — unlike the bbox height, not inflated by a tilted photo. */
	height: number;
	/** Rise over run of the text's top edge, i.e. how tilted this line is in the photo. */
	slope: number;
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
	/** Best-guess purchase date as YYYY-MM-DD, or null. */
	date: string | null;
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
	/** Corners clockwise from top-left. Absent from older OCR service versions. */
	quad?: [number, number][];
}

// An amount, optionally with thousands groups. The lookarounds reject the digit
// runs that merely resemble one: dates (12.03.24), times and percentages.
const MONEY_TOKEN = /(?<![\d]|\d[.,:/-])(?:\d{1,3}(?:['’.,]\d{3})+|\d+)[.,]\d{2}(?![.,:/-]?\d|\s*%)/g;
// The OCR reads a printed minus as any of these, including the CJK "one".
const MINUS = '-−–—一';
// A run of dashes is a leader ("Total ---- 12.50"), and one joining a word to a
// currency is a hyphen ("Total-CHF 12.50"); neither makes the amount negative.
const NEGATIVE_BEFORE = new RegExp(
	`(?<![${MINUS}])[${MINUS}]\\s*$|(?<![${MINUS}\\p{L}])[${MINUS}]\\s*(?:s?fr\\.?|chf|eur|€)\\s*$`,
	'iu'
);
const NEGATIVE_AFTER = new RegExp(`^[${MINUS}](?![${MINUS}])`);
const TOTAL_RE = /\btotal|summe|gesamt|betrag|zu\s*zahlen|to\s*pay|amount\s*due/i;
const EXCLUDE_RE =
	/(sub\s*total|zwischen\s*(total|summe)|netto|mwst|mehrwertsteuer|steuer|\bvat\b|\btva\b|\btax\b|rückgeld|ruckgeld|rückgabe|retour|change|gegeben|\bcash\b|\bbar\b|twint|karte|\bcard\b|buchung|terminal|trinkgeld|\btip\b|rabatt|saldo|gutschein|sparen|ersparnis)/i;

// Scoring weights for detectTotalLine. A label alone beats the largest amount, and
// clearly oversized print beats a label on an amount that isn't even the largest.
const LABEL_SCORE = 3;
const SIZE_SCORE = 3;
const LARGEST_AMOUNT_SCORE = 1;
// Perspective alone makes the near end of a photographed receipt ~15% larger.
const SIZE_NOISE_RATIO = 1.2;
const SIZE_FULL_RATIO = 2;
// A tilt beyond this means a sideways photo, where the slope says nothing useful.
const MAX_SKEW_SLOPE = 0.35;

/** Parse the last money-looking token on a line into a number, negative for deductions. */
export function parsePrice(text: string): number | null {
	const match = [...text.matchAll(MONEY_TOKEN)].at(-1);
	if (!match) return null;
	const token = match[0];
	const intPart = token.slice(0, -3).replace(/\D/g, '');
	const value = parseFloat(`${intPart || '0'}.${token.slice(-2)}`);
	if (!Number.isFinite(value)) return null;
	const negative =
		NEGATIVE_BEFORE.test(text.slice(0, match.index)) ||
		NEGATIVE_AFTER.test(text.slice(match.index + token.length));
	return negative ? -value : value;
}

/**
 * Find the purchase date on the receipt. Returns YYYY-MM-DD or null. Picks the
 * most frequently occurring plausible date (receipts repeat it across the
 * transaction lines), assuming day-first (DD.MM.YYYY) for European receipts.
 */
function detectDate(lines: ReceiptLine[]): string | null {
	const text = lines.map((l) => l.text).join('\n');
	const now = new Date();
	const maxTime = now.getTime() + 36 * 3600 * 1000; // allow ~today (tz slack)
	const minYear = 2015;
	const maxYear = now.getFullYear() + 1;
	/** @type {string[]} */
	const found: string[] = [];

	const add = (y: number, m: number, d: number) => {
		if (m < 1 || m > 12 || d < 1 || d > 31 || y < minYear || y > maxYear) return;
		const dt = new Date(y, m - 1, d);
		if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return;
		if (dt.getTime() > maxTime) return;
		found.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
	};

	// ISO: YYYY-MM-DD
	for (const m of text.matchAll(/\b(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/g)) {
		add(+m[1], +m[2], +m[3]);
	}
	// European: DD.MM.YYYY or DD.MM.YY
	for (const m of text.matchAll(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/g)) {
		let y = +m[3];
		if (y < 100) y += 2000;
		add(y, +m[2], +m[1]);
	}

	if (found.length === 0) return null;
	const counts = new Map<string, number>();
	for (const c of found) counts.set(c, (counts.get(c) ?? 0) + 1);
	let best = found[0];
	let bestCount = 0;
	for (const [c, n] of counts) {
		if (n > bestCount) {
			best = c;
			bestCount = n;
		}
	}
	return best;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Text printed left of each line on the same row, including the line itself. The
 * OCR usually detects a label and its right-aligned amount as separate boxes.
 */
function rowLabels(lines: ReceiptLine[]): Map<ReceiptLine, string> {
	const skew = lines.length > 0 ? median(lines.map((l) => l.slope)) : 0;
	const slope = Math.abs(skew) <= MAX_SKEW_SLOPE ? skew : 0;
	const level = (l: ReceiptLine) =>
		(l.bbox.y0 + l.bbox.y1) / 2 - (slope * (l.bbox.x0 + l.bbox.x1)) / 2;

	return new Map(
		lines.map((line) => {
			const row = lines
				.filter(
					(o) =>
						o.bbox.x0 <= line.bbox.x0 &&
						Math.abs(level(o) - level(line)) < 0.6 * Math.min(o.height, line.height)
				)
				.sort((a, b) => a.bbox.x0 - b.bbox.x0);
			return [line, row.map((o) => o.text).join(' ')];
		})
	);
}

/**
 * Pick the line that best represents the grand total, or null. Combines three
 * signals: a total label, print noticeably larger than the receipt's other
 * amounts, and being the largest amount.
 */
export function detectTotalLine(lines: ReceiptLine[]): ReceiptLine | null {
	const labels = rowLabels(lines);
	const candidates = lines.filter(
		(l) => l.price !== null && l.price > 0 && !EXCLUDE_RE.test(labels.get(l) as string)
	);
	if (candidates.length === 0) return null;

	const priced = lines.filter((l) => l.price !== null);
	// Too few amounts to tell what normal print looks like on this receipt.
	const normalHeight = priced.length >= 3 ? median(priced.map((l) => l.height)) : 0;
	const largestAmount = Math.max(...candidates.map((l) => l.price as number));

	const score = (l: ReceiptLine) => {
		const ratio = normalHeight > 0 ? l.height / normalHeight : 1;
		const oversize = (ratio - SIZE_NOISE_RATIO) / (SIZE_FULL_RATIO - SIZE_NOISE_RATIO);
		return (
			(TOTAL_RE.test(labels.get(l) as string) ? LABEL_SCORE : 0) +
			SIZE_SCORE * Math.min(Math.max(oversize, 0), 1) +
			(l.price === largestAmount ? LARGEST_AMOUNT_SCORE : 0)
		);
	};

	return candidates.reduce((best, l) => {
		const diff = score(l) - score(best);
		return diff > 0 || (diff === 0 && (l.price as number) > (best.price as number)) ? l : best;
	});
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

function quadMetrics(l: OcrServiceLine): { height: number; slope: number } {
	if (l.quad?.length !== 4) return { height: l.box[3] - l.box[1], slope: 0 };
	const [tl, tr, br, bl] = l.quad;
	const run = tr[0] - tl[0];
	return {
		height: (Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) + Math.hypot(br[0] - tr[0], br[1] - tr[1])) / 2,
		slope: run === 0 ? 0 : (tr[1] - tl[1]) / run
	};
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
		bbox: { x0: l.box[0], y0: l.box[1], x1: l.box[2], y1: l.box[3] },
		...quadMetrics(l)
	}));

	const totalLine = detectTotalLine(lines);
	const date = detectDate(lines);

	// Debug: dump every scanned line and the chosen total line to the console
	console.groupCollapsed(`[receipt OCR] ${lines.length} lines`);
	lines.forEach((l, i) => {
		console.log(
			`${String(i).padStart(2, '0')}  ${l.price != null ? l.price.toFixed(2).padStart(9) : '        —'}  h=${l.height.toFixed(0).padStart(3)}  ${l.text}`
		);
	});
	console.log(
		'%c[receipt OCR] total →',
		'font-weight:bold',
		totalLine ? `${totalLine.price?.toFixed(2)}  «${totalLine.text}»` : 'none detected'
	);
	console.log('%c[receipt OCR] date →', 'font-weight:bold', date ?? 'none detected');
	console.groupEnd();

	return {
		lines,
		total: totalLine?.price ?? null,
		date,
		totalBox: totalLine?.bbox ?? null,
		width: data.width,
		height: data.height,
		rawText: lines.map((l) => l.text).join('\n')
	};
}

/**
 * Build-time stand-ins for small graphics — the route icons and the canton /
 * Bundesland / country emblems on the hikes pages — shown until the real SVG
 * has loaded.
 *
 * - `graphicOutline`: the graphic's silhouette in its most common colour — a plain shield, a green square. Tracing any
 *   detail on top at this size came out as splinters, so there is none.
 * - `numberedSquare`: for a route sign whose number the author gave in the
 *   frontmatter (`iconNumber`, `iconNumberPosition`), the square in that
 *   colour with the number on it.
 */

import sharp from 'sharp';
import ImageTracer from 'imagetracerjs';
import { optimize } from 'svgo';

/** Raster size the outline is traced at. */
const TRACE_SIZE = 32;

/** Bump when the output changes — callers cache on it. */
export const GRAPHIC_PLACEHOLDER_VERSION = 2;

export const ICON_NUMBER_POSITIONS = [
	'top-left',
	'top-center',
	'top-right',
	'center-left',
	'center',
	'center-right',
	'bottom-left',
	'bottom-center',
	'bottom-right'
] as const;
export type IconNumberPosition = (typeof ICON_NUMBER_POSITIONS)[number];

type RGB = [number, number, number];

const toHex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

type ImageTracerModule = {
	imagedataToTracedata: (
		img: { width: number; height: number; data: Uint8ClampedArray },
		opts: Record<string, unknown>
	) => {
		layers: {
			isholepath: boolean;
			segments: { type: 'L' | 'Q'; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number }[];
		}[][];
	};
};
const tracer = ImageTracer as unknown as ImageTracerModule;

/** Trace a binary mask into one path — its outer edges only, so a graphic
 * that is partly transparent inside still comes out as a solid silhouette. */
function traceMask(mask: Uint8Array, w: number, h: number): string {
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < w * h; i++) {
		const v = mask[i] ? 0 : 255;
		data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
		data[i * 4 + 3] = 255;
	}
	const traced = tracer.imagedataToTracedata(
		{ width: w, height: h, data },
		{
			pal: [
				{ r: 0, g: 0, b: 0, a: 255 },
				{ r: 255, g: 255, b: 255, a: 255 }
			],
			ltres: 0.5,
			qtres: 0.5,
			pathomit: 4,
			roundcoords: 1,
			blurradius: 0,
			colorquantcycles: 1
		}
	);
	let d = '';
	for (const p of traced.layers[0]) {
		const segs = p.segments;
		if (p.isholepath || segs.length === 0) continue;
		d += `M${segs[0].x1} ${segs[0].y1}`;
		for (const s of segs) d += s.type === 'L' ? `L${s.x2} ${s.y2}` : `Q${s.x2} ${s.y2} ${s.x3} ${s.y3}`;
		d += 'Z';
	}
	return d;
}

/** A `data:` URI that stays readable: only what a URL can't carry is escaped,
 * and double quotes become single ones so it fits inside `url("…")`. */
function svgDataUri(svg: string): string {
	const body = svg.replace(/"/g, "'").replace(/[<>#%\n]/g, encodeURIComponent);
	return `data:image/svg+xml,${body}`;
}

/**
 * Trace a graphic (SVG or raster bytes) to its outline in its main colour.
 * @returns the `data:image/svg+xml,…` URI and that colour, or undefined if the
 *          graphic can't be read.
 */
export async function graphicOutline(input: Buffer): Promise<{ uri: string; colour: string } | undefined> {
	try {
		const { data, info } = await sharp(input, { density: 400 })
			.resize(TRACE_SIZE, TRACE_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const { width: w, height: h } = info;
		const n = w * h;

		// Most common colour among the opaque pixels, in 3-bit-per-channel
		// buckets so anti-aliasing doesn't split it; then the mean of that bucket.
		const bucket = (i: number) => ((data[i * 4] >> 5) << 6) | ((data[i * 4 + 1] >> 5) << 3) | (data[i * 4 + 2] >> 5);
		const counts = new Map<number, number>();
		for (let i = 0; i < n; i++) {
			if (data[i * 4 + 3] > 200) counts.set(bucket(i), (counts.get(bucket(i)) ?? 0) + 1);
		}
		const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
		if (!top) return undefined;
		const sum: RGB = [0, 0, 0];
		for (let i = 0; i < n; i++) {
			if (data[i * 4 + 3] > 200 && bucket(i) === top[0]) {
				sum[0] += data[i * 4];
				sum[1] += data[i * 4 + 1];
				sum[2] += data[i * 4 + 2];
			}
		}
		const colour = toHex(sum.map((v) => v / top[1]) as RGB);

		const outline = new Uint8Array(n);
		for (let i = 0; i < n; i++) outline[i] = data[i * 4 + 3] > 127 ? 1 : 0;
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
			`<path fill="${colour}" d="${traceMask(outline, w, h)}"/></svg>`;
		return { uri: svgDataUri(optimize(svg, { multipass: true, floatPrecision: 1 }).data), colour };
	} catch {
		return undefined;
	}
}

/**
 * A square in `colour` with `number` in bold white at `position` — the shape
 * of a Wanderland route sign.
 */
export function numberedSquare(number: string, position: IconNumberPosition, colour: string): string {
	const S = 32;
	const PAD = 2.5;
	// Bold digits run about 0.6 em wide; shrink longer numbers to fit.
	const size = number.length <= 2 ? 16 : number.length === 3 ? 12.5 : Math.min(9.5, (S - 2 * PAD) / (0.6 * number.length));
	const [row, col = row] = position.split('-') as [string, string?];
	const x = col === 'left' ? PAD : col === 'right' ? S - PAD : S / 2;
	const anchor = col === 'left' ? 'start' : col === 'right' ? 'end' : 'middle';
	// Baselines: digits have no descenders and a cap height of about 0.72 em.
	const y = row === 'top' ? PAD + 0.72 * size : row === 'bottom' ? S - PAD : S / 2 + 0.36 * size;
	const text = number.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return svgDataUri(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">` +
			`<rect width="${S}" height="${S}" fill="${colour}"/>` +
			`<text x="${x}" y="${y.toFixed(1)}" text-anchor="${anchor}" fill="#fff" ` +
			`font-family="Helvetica,Arial,sans-serif" font-size="${size.toFixed(1)}" font-weight="700" font-style="italic">` +
			`${text}</text></svg>`
	);
}

/**
 * Blurred image placeholders (LQIP), shared by the hikes build script and the
 * recipe image pipeline.
 *
 * The result is a single `data:` URI of about a kilobyte: a tiny WebP wrapped
 * in an SVG that blurs it with `feGaussianBlur`. Unlike a BlurHash it needs no
 * decoder and no JavaScript, so it paints with the first frame the server
 * sends — set it as a `--lqip` custom property and let the stylesheet use it as
 * a background (see `--lqip-grain` in app.css for the dither that goes on top).
 *
 * Three details carry the quality, and all three are easy to lose:
 *
 * 1. **The SVG wrapper.** A bare 20 px image stretched across a 1200 px hero is
 *    upscaled bilinearly by the browser, which turns every source pixel into a
 *    visible soft square — the blur reads as blocking. Blurring inside the SVG
 *    happens in user space *after* that scale, so the result is a real gaussian
 *    at display size however far it was stretched, and the source stays tiny.
 * 2. **WebP, not AVIF.** Below roughly a kilobyte AVIF's container overhead
 *    dominates: 246 vs 342 bytes for the same 20 px source.
 * 3. **`color-interpolation-filters="sRGB"`.** The SVG default is linearRGB,
 *    and the 8-bit sRGB→linear→sRGB round-trip a filter does throws away
 *    precision in the shadows, which is exactly where banding shows first.
 */

import sharp from 'sharp';

/** Longest side of the source image inside the placeholder, in pixels. */
export const LQIP_BOX = 20;
export const LQIP_QUALITY = 55;
/** Gaussian radius in placeholder pixels — scales with the display size. */
export const LQIP_SIGMA = 0.85;

/**
 * Bump when anything above changes: callers that cache placeholders key on
 * this, so old ones get recomputed instead of served.
 */
export const LQIP_VERSION = 6;

/**
 * Build a blurred placeholder for an image.
 *
 * @param input Encoded image bytes (or a path sharp can read).
 * @param box   Longest side of the embedded source; larger means more detail
 *              and more bytes. The default suits everything from a 300 px card
 *              to a full-bleed hero.
 * @returns A `data:image/svg+xml;base64,…` URI, or undefined if the image
 *          could not be read — a placeholder is a nicety, never a hard failure.
 */
export async function blurPlaceholder(
	input: Buffer | string,
	box: number = LQIP_BOX
): Promise<string | undefined> {
	try {
		// `fit: 'inside'` keeps the aspect ratio and lets the output tell us the
		// real dimensions — which is also how EXIF rotation is accounted for
		// without reading the orientation tag by hand.
		const { data, info } = await sharp(input)
			.rotate()
			.resize({ width: box, height: box, fit: 'inside' })
			.webp({ quality: LQIP_QUALITY })
			.toBuffer({ resolveWithObject: true });
		const { width: w, height: h } = info;
		// `feFuncA` flattens the alpha the blur pulls in at the edges — without
		// it the placeholder fades out into a translucent frame.
		// NOTE the missing `preserveAspectRatio` on the root element — it belongs
		// on the inner <image> and nowhere else. A root that declares
		// `preserveAspectRatio="none"` is a stretchable image with no intrinsic
		// aspect ratio, so CSS has nothing to preserve: `background-size: cover`
		// silently degrades to filling the box, and the placeholder shows the
		// whole photo squeezed in while the photo itself crops. Verified in
		// Chromium against a banded test image.
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
			`<filter id="b" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
			`<feGaussianBlur stdDeviation="${LQIP_SIGMA}"/>` +
			`<feComponentTransfer><feFuncA type="discrete" tableValues="1 1"/></feComponentTransfer>` +
			`</filter>` +
			`<image filter="url(#b)" width="${w}" height="${h}" preserveAspectRatio="none" ` +
			`href="data:image/webp;base64,${data.toString('base64')}"/></svg>`;
		// base64 rather than percent-encoding: the result goes into an HTML style
		// attribute, and base64's alphabet needs no escaping there.
		return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
	} catch {
		return undefined;
	}
}

/**
 * Round portraits of the Church Fathers for the Bible reader.
 *
 *   pnpm bible:fathers            # crop every portrait in the registry
 *   pnpm bible:fathers --sheet    # also write a contact sheet to check the faces
 *
 * For each registry record with a `portrait`, the original in
 * static/glaube/fathers/<file> is cut to the largest square around the
 * face (`focus`, fractions of width and height) that fits the image, and
 * written as <id>-{48,96,192}.webp next to it. The originals stay so a focus
 * can be moved and the crops re-cut. The blurred placeholders the avatars
 * paint while a crop loads are rebuilt afterwards (build-fathers-blur.ts).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { FATHERS, PORTRAIT_SIZES } from '../src/lib/faith/fathers';

const DIR = path.resolve('static', 'glaube', 'fathers');
const SHEET = process.argv.includes('--sheet');
const sheetTiles: { input: Buffer; left: number; top: number }[] = [];
let n = 0;
const withPortrait = FATHERS.filter((f) => f.portrait);
for (const [i, fa] of withPortrait.entries()) {
	const src = path.join(DIR, fa.portrait!.file);
	if (!existsSync(src)) {
		console.warn(`[fathers] ${fa.id}: ${fa.portrait!.file} missing`);
		continue;
	}
	const img = sharp(src, { failOn: 'none' });
	const meta = await img.metadata();
	const w = meta.width ?? 0;
	const h = meta.height ?? 0;
	const [fx, fy] = fa.portrait!.focus;
	// A square of side `side` centred on the face, clamped into the image.
	const side = Math.round(Math.min(w, h) * (fa.portrait!.zoom ?? 0.6));
	const left = Math.round(Math.min(Math.max(0, fx * w - side / 2), w - side));
	const top = Math.round(Math.min(Math.max(0, fy * h - side / 2), h - side));
	for (const size of PORTRAIT_SIZES) {
		await sharp(src, { failOn: 'none' }).extract({ left, top, width: side, height: side }).resize(size, size).webp({ quality: 82 }).toFile(path.join(DIR, `${fa.id}-${size}.webp`));
	}
	n++;
	if (SHEET) {
		const tile = await sharp(src, { failOn: 'none' }).extract({ left, top, width: side, height: side }).resize(160, 160).png().toBuffer();
		sheetTiles.push({ input: tile, left: (i % 6) * 170 + 5, top: Math.floor(i / 6) * 190 + 5 });
	}
}
if (SHEET) {
	const rows = Math.ceil(withPortrait.length / 6);
	const labels = withPortrait.map((fa, i) => `<text x="${(i % 6) * 170 + 85}" y="${Math.floor(i / 6) * 190 + 182}" font-size="13" text-anchor="middle" font-family="sans-serif">${fa.id}</text>`).join('');
	const svg = Buffer.from(`<svg width="1030" height="${rows * 190 + 10}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${labels}</svg>`);
	const out = path.resolve(process.env.SHEET_OUT ?? 'fathers-sheet.png');
	await sharp(svg).composite(sheetTiles).png().toFile(out);
	console.log(`[fathers] contact sheet → ${out}`);
}
console.log(`[fathers] ${n} portraits cut to ${PORTRAIT_SIZES.join('/')} px`);
// The crops changed, so the placeholders cut from them follow.
await import('./build-fathers-blur');

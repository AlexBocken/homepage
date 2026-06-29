// Vectorize the body-part measurement icons (static/fitness/measure/*.png) into
// clean SVGs. Unlike the sticker silhouette tracer, we keep EVERY contour — the
// icons are line drawings, so the inner strokes (muscle lines, tendons, …) are
// just as important as the outer outline.
//
// The PNGs are black line-art on a transparent background. We flatten them onto
// white, threshold to black-on-white, and run potrace. The filled result traces
// both edges of every stroke (each line becomes a thin filled ribbon with a hole
// down its middle), faithfully reproducing the drawing. We emit fill="currentColor"
// so the icons inherit the theme colour like the hand-authored measure SVGs.
//
// Run: node scripts/trace-measure-icons.mjs

import { readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { trace } from 'potrace';

const traceAsync = promisify(trace);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const measureDir = join(root, 'static', 'fitness', 'measure');
const outDir = join(measureDir, 'cleaned');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const pngs = readdirSync(measureDir).filter((f) => /\.(png|jpe?g)$/i.test(f));

let traced = 0;
for (const name of pngs.sort()) {
  const file = join(measureDir, name);

  // Flatten transparency onto white, then grayscale. The line art is black, so
  // it stays the potrace foreground after thresholding.
  const { data, info } = await sharp(file)
    .flatten({ background: '#ffffff' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Re-wrap as PNG at native resolution for potrace (preserves stroke detail).
  const bitmap = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels }
  })
    .png()
    .toBuffer();

  const svgRaw = await traceAsync(bitmap, {
    turdSize: 10, // drop tiny specks but keep fine strokes
    optCurve: true,
    optTolerance: 0.4, // tighter than the sticker tracer to keep line fidelity
    threshold: 200, // anything non-white counts as ink
    blackOnWhite: true,
    turnPolicy: 'minority'
  });

  // Keep ALL contours — pull just the path data and re-wrap with currentColor.
  const d = [...svgRaw.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  if (!d) {
    console.warn('  no contours:', name);
    continue;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${info.width} ${info.height}">` +
    `<path d="${d}" fill="currentColor" fill-rule="evenodd"/></svg>`;

  writeFileSync(join(outDir, basename(name).replace(/\.(png|jpe?g)$/i, '.svg')), svg);
  traced++;
  process.stdout.write('.');
}

console.log(`\ntraced ${traced}/${pngs.length} icons → static/fitness/measure/cleaned/`);

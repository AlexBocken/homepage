// Generate dashed-outline silhouette paths for the sticker placeholders.
//
// For each sticker referenced in the catalog (plus the shelf placeholder), we
// rasterize the SVG, turn its alpha into a black-on-white silhouette, and run
// potrace to get a smooth contour path. The paths are written to
// src/lib/data/stickerSilhouettes.js and stroked with stroke-dasharray at
// render time, so the dashes actually follow the cat's outline.
//
// Run: node scripts/trace-sticker-silhouettes.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { trace } from 'potrace';

const traceAsync = promisify(trace);

// --- drop inner contours (holes / details) that sit inside another subpath ---
const splitSubpaths = (d) => d.match(/M[^M]*/g) || [];
const pointsOf = (sub) => {
  const nums = (sub.match(/-?\d*\.?\d+/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
};
const bbox = (pts) => {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of pts) {
    if (x < minx) minx = x;
    if (y < miny) miny = y;
    if (x > maxx) maxx = x;
    if (y > maxy) maxy = y;
  }
  return { minx, miny, maxx, maxy, area: (maxx - minx) * (maxy - miny) };
};
const bboxContains = (a, b) => a.minx <= b.minx && a.miny <= b.miny && a.maxx >= b.maxx && a.maxy >= b.maxy;
const pointInPoly = ([px, py], poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const fracInside = (pts, poly) => pts.reduce((n, p) => n + (pointInPoly(p, poly) ? 1 : 0), 0) / pts.length;

/** Keep only top-level subpaths — drop any contained by a larger one. */
function keepOuter(d) {
  const subs = splitSubpaths(d).map((s) => ({ s, pts: pointsOf(s) })).filter((o) => o.pts.length > 2);
  for (const o of subs) o.bb = bbox(o.pts);
  const kept = subs.filter(
    (a) => !subs.some((b) => b !== a && b.bb.area > a.bb.area && bboxContains(b.bb, a.bb) && fracInside(a.pts, b.pts) > 0.5)
  );
  return kept.map((k) => k.s.trim()).join(' ');
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stickersDir = join(root, 'static', 'stickers');
const SIZE = 200; // raster + viewBox size

// Which stickers to trace: everything in the catalog + the shelf placeholder.
const catalog = readFileSync(join(root, 'src/lib/utils/stickers.ts'), 'utf8');
const names = new Set(['blobcat_adorable.svg']);
for (const m of catalog.matchAll(/image:\s*'([^']+\.svg)'/g)) names.add(m[1]);

const outDir = join(stickersDir, 'outlines');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Baked outline shape. Stroke is opaque white so the file works as a CSS mask —
// the colour is applied per-context in CSS (rarity tint on the card, paper-brown
// on the album/shelf). The viewBox is padded so the stroke (and its round caps)
// isn't clipped where the silhouette reaches the edge of the traced bitmap.
const STROKE = '#fff';
const PAD = 10;
const outlineSvg = (d) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${SIZE + 2 * PAD} ${SIZE + 2 * PAD}">` +
  `<path d="${d}" fill="none" stroke="${STROKE}" stroke-width="9" ` +
  `stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.5 16"/></svg>`;

let traced = 0;
for (const name of [...names].sort()) {
  const file = join(stickersDir, name);
  if (!existsSync(file)) {
    console.warn('  missing:', name);
    continue;
  }
  // alpha → grayscale (255 opaque), negate so the shape is black (potrace fg).
  const bitmap = await sharp(file, { density: 200 })
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .extractChannel('alpha')
    .negate()
    .png()
    .toBuffer();

  const svg = await traceAsync(bitmap, {
    turdSize: 30, // drop small specks
    optCurve: true,
    optTolerance: 0.7,
    threshold: 128,
    blackOnWhite: true,
    turnPolicy: 'minority'
  });

  const raw = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  const d = keepOuter(raw);
  if (d) {
    writeFileSync(join(outDir, name), outlineSvg(d));
    traced++;
  }
  process.stdout.write('.');
}

console.log(`\ntraced ${traced}/${names.size} outlines → static/stickers/outlines/`);

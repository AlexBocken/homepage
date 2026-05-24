/**
 * Build script for private (auth-gated) images rendered via `<Image private>`.
 *
 * Public images use @sveltejs/enhanced-img, which emits PUBLIC hashed assets
 * into the client bundle — fine for anything anyone may see. Private images
 * must not be publicly reachable, so they can't go through enhanced-img. This
 * script mirrors the hikes private pipeline instead:
 *
 *   1. Scan `src/lib/assets/private-images/` (recursively) for raster sources.
 *   2. Encode each into AVIF + WebP at multiple widths with sharp, named by
 *      content hash, into `private-assets/` — a tree OUTSIDE the client bundle
 *      and outside `/static`, so SvelteKit/Vite never serve it directly.
 *   3. Emit `src/lib/data/privateImages.generated.ts`: a manifest mapping each
 *      source path to its responsive variant, with URLs under `/private-images/`
 *      (the auth-gated endpoint at src/routes/private-images/[...file]/+server.ts).
 *
 * Deploy rsyncs `private-assets/` to the server, where nginx serves it only via
 * an `internal` location (`/protected-images/`) reachable through X-Accel-Redirect
 * from the endpoint — never publicly. In dev the endpoint streams from disk.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import sharp from 'sharp';
import type { PrivateImageVariant } from '../src/types/images.js';

const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, 'src', 'lib', 'assets', 'private-images');
// Encoded output. Sibling of `hikes-assets/` and, like it, gitignored + rsynced
// to the server by scripts/deploy.sh (never bundled, never under /static).
const OUT_DIR = path.join(ROOT, 'private-assets');
const MANIFEST_OUT = path.join(ROOT, 'src', 'lib', 'data', 'privateImages.generated.ts');

// Same responsive ladder + qualities as the hikes encoder, for consistency.
const IMAGE_WIDTHS = [480, 960, 1600] as const;
const AVIF_QUALITY = 55;
const WEBP_QUALITY = 82;
const RASTER_RE = /\.(jpe?g|png|webp|avif|tiff?|gif|heic|heif)$/i;
// Sharp releases the JS thread while libvips runs, so a small pool ~linearly
// speeds up encoding. Cap at 4 to avoid thrashing smaller boxes.
const CONCURRENCY = Math.max(2, Math.min(os.cpus().length, 4));

async function pathExists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

async function runWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (true) {
			const i = next++;
			if (i >= items.length) return;
			results[i] = await worker(items[i], i);
		}
	});
	await Promise.all(runners);
	return results;
}

async function walk(dir: string): Promise<string[]> {
	let entries: import('node:fs').Dirent[];
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	let out: string[] = [];
	for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) out = out.concat(await walk(full));
		else if (RASTER_RE.test(e.name)) out.push(full);
	}
	return out;
}

async function encode(
	srcPath: string
): Promise<{ key: string; variant: PrivateImageVariant; outNames: string[] }> {
	const buffer = await fs.readFile(srcPath);
	// Content hash names the output files: an existing file is byte-identical, so
	// re-encodes are skipped and stale ones get swept. The source basename is
	// dropped so original filenames don't leak into the (guessable) URLs.
	const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);

	const meta = await sharp(buffer).metadata();
	const intrinsicW = meta.width ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
	const intrinsicH = meta.height ?? 0;

	let widths = IMAGE_WIDTHS.filter((w) => w <= intrinsicW);
	if (widths.length === 0) widths = [intrinsicW];

	await fs.mkdir(OUT_DIR, { recursive: true });

	type Job = { w: number; fmt: 'avif' | 'webp'; file: string; quality: number };
	const jobs: Job[] = [];
	const avif: string[] = [];
	const webp: string[] = [];
	const outNames: string[] = [];
	let largestWebp = '';

	for (const w of widths) {
		const avifName = `${hash}.${w}.avif`;
		const webpName = `${hash}.${w}.webp`;
		jobs.push({ w, fmt: 'avif', file: path.join(OUT_DIR, avifName), quality: AVIF_QUALITY });
		jobs.push({ w, fmt: 'webp', file: path.join(OUT_DIR, webpName), quality: WEBP_QUALITY });
		avif.push(`/private-images/${avifName} ${w}w`);
		webp.push(`/private-images/${webpName} ${w}w`);
		largestWebp = `/private-images/${webpName}`;
		outNames.push(avifName, webpName);
	}

	const presence = await Promise.all(jobs.map((j) => pathExists(j.file)));
	const pending = jobs.filter((_, i) => !presence[i]);
	await Promise.all(
		pending.map(async (j) => {
			const pipeline = sharp(buffer).rotate().resize({ width: j.w, withoutEnlargement: true });
			if (j.fmt === 'avif') await pipeline.avif({ quality: j.quality }).toFile(j.file);
			else await pipeline.webp({ quality: j.quality }).toFile(j.file);
		})
	);

	const largestW = widths[widths.length - 1];
	const scale = largestW / intrinsicW;
	const height = Math.round((intrinsicH || largestW) * scale);
	// Manifest key: source path relative to SRC_DIR, forward-slashed, so a caller
	// writes <Image src="blog/cover.jpg" private />.
	const key = path.relative(SRC_DIR, srcPath).split(path.sep).join('/');

	return {
		key,
		variant: {
			src: largestWebp,
			srcsetAvif: avif.join(', '),
			srcsetWebp: webp.join(', '),
			width: largestW,
			height
		},
		outNames
	};
}

async function main() {
	const files = await walk(SRC_DIR);
	if (files.length > 0) {
		console.log(`[build-private-images] encoding ${files.length} image(s) (concurrency=${CONCURRENCY})…`);
	}

	const results = await runWithConcurrency(files, CONCURRENCY, (f) => encode(f));

	const manifest: Record<string, PrivateImageVariant> = {};
	const keep = new Set<string>();
	for (const r of results) {
		manifest[r.key] = r.variant;
		for (const n of r.outNames) keep.add(n);
	}

	// Sweep encodes from prior builds whose source was removed or changed.
	if (await pathExists(OUT_DIR)) {
		const existing = await fs.readdir(OUT_DIR);
		const orphans = existing.filter((f) => !keep.has(f));
		if (orphans.length > 0) {
			await Promise.all(orphans.map((f) => fs.unlink(path.join(OUT_DIR, f)).catch(() => {})));
			console.log(`[build-private-images] removed ${orphans.length} orphaned file(s)`);
		}
	}

	await fs.mkdir(path.dirname(MANIFEST_OUT), { recursive: true });
	const banner =
		'// AUTO-GENERATED by scripts/build-private-images.ts — do not edit by hand.\n' +
		"import type { PrivateImageVariant } from '$types/images';\n\n";
	const body = `export const PRIVATE_IMAGES: Record<string, PrivateImageVariant> = ${JSON.stringify(
		manifest,
		null,
		2
	)};\n`;
	await fs.writeFile(MANIFEST_OUT, banner + body);

	console.log(
		`[build-private-images] wrote ${Object.keys(manifest).length} entry(ies) to ${path.relative(ROOT, MANIFEST_OUT)}`
	);
}

main().catch((err) => {
	console.error('[build-private-images] Fatal:', err);
	process.exit(1);
});

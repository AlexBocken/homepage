/**
 * Postbuild: precompress static build output for nginx `gzip_static` /
 * `brotli_static`.
 *
 * Replaces adapter-node's `precompress: true`, which brotli-q11 + gzips EVERY
 * file in build/client single-threaded — including ~90 MB of already-compressed
 * jpg/mp4/png/webp/woff2 (zero gain) and 20 MB+ text blobs at q11 (~30 s each).
 *
 * This version instead:
 *   - only touches compressible text types (skips binaries entirely),
 *   - tunes brotli quality down for large files (q11 is wildly slow past a few MB
 *     for marginal ratio gains over q10/q9),
 *   - runs gzip + brotli concurrently across the libuv threadpool,
 *   - skips files that already have a .br/.gz sibling (e.g. the error pages the
 *     build-error-page step emits), so it's idempotent.
 *
 * Run: pnpm exec vite-node scripts/precompress.ts
 */

// The async gzip/brotli calls run on libuv's threadpool. Its size must be set
// before the pool is first used — by the time this module runs under vite-node
// the pool is already up, so postbuild sets UV_THREADPOOL_SIZE on the command
// line (the authoritative knob). This line is just a fallback default for
// direct `vite-node scripts/precompress.ts` runs and won't override an
// already-set value.
import os from 'node:os';
const CORES = Math.max(1, os.cpus().length);
process.env.UV_THREADPOOL_SIZE ||= String(Math.min(CORES, 12));

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip, brotliCompress, constants as zlib } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIRS = ['build/client', 'build/prerendered'];

// Only these extensions are worth compressing; everything else (images, video,
// fonts, archives) is already compressed and skipped.
const COMPRESSIBLE = new Set([
	'.js', '.mjs', '.cjs', '.css', '.html', '.htm', '.json', '.map',
	'.svg', '.xml', '.txt', '.tsv', '.csv', '.wasm', '.webmanifest', '.ico'
]);

// Server-side-only data that nonetheless lands in build/client and is read back
// from disk server-side (never delivered to a browser). A .br/.gz sibling for
// these is dead weight nginx never serves — and they're the largest, slowest
// files in the tree, so skipping them is where almost all the time goes. They
// must still exist UNCOMPRESSED for the server reads, so we skip rather than
// remove them. Two kinds:
//   - bible TSVs: read via src/lib/server/staticAsset.ts → resolveStaticAsset
//   - ML embedding JSONs: `?url`-imported by $lib/server/{nutritionMatcher,
//     shoppingCategorizer}.ts and read via SvelteKit's read(); emitted into
//     _app/immutable/assets/ with a content hash (…Embeddings.<hash>.json).
const SERVER_ONLY_NAMES = new Set(['allioli.tsv', 'drb.tsv']);
const SERVER_ONLY_RE = /embeddings\.[^/]*\.json$/i;
function isServerOnly(file: string): boolean {
	const base = basename(file);
	return SERVER_ONLY_NAMES.has(base) || SERVER_ONLY_RE.test(base);
}

// Don't bother compressing tiny files — overhead/headers outweigh the savings.
const MIN_BYTES = 1024;

/** Pick a brotli quality that balances ratio against time for large files. */
function brotliQuality(size: number): number {
	if (size > 4 * 1024 * 1024) return 9; // >4 MB: q9 (q11 would take 30 s+)
	if (size > 1024 * 1024) return 10; // 1–4 MB
	return 11; // small files: max ratio, still fast
}

async function* walk(dir: string): AsyncGenerator<string> {
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return; // dir doesn't exist (e.g. no prerendered output) — skip
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile()) yield full;
	}
}

async function collect(): Promise<string[]> {
	const files: string[] = [];
	for (const rel of TARGET_DIRS) {
		for await (const f of walk(join(ROOT, rel))) {
			const ext = extname(f).toLowerCase();
			if (!COMPRESSIBLE.has(ext)) continue;
			if (f.endsWith('.gz') || f.endsWith('.br')) continue;
			if (isServerOnly(f)) continue;
			files.push(f);
		}
	}
	return files;
}

async function exists(p: string): Promise<boolean> {
	try {
		await stat(p);
		return true;
	} catch {
		return false;
	}
}

let saved = 0;
let written = 0;

async function compressOne(file: string): Promise<void> {
	const buf = await readFile(file);
	if (buf.length < MIN_BYTES) return;

	const jobs: Promise<void>[] = [];

	if (!(await exists(file + '.gz'))) {
		jobs.push(
			gzipAsync(buf, { level: zlib.Z_BEST_COMPRESSION }).then(async (out) => {
				if (out.length < buf.length) {
					await writeFile(file + '.gz', out);
					written++;
					saved += buf.length - out.length;
				}
			})
		);
	}

	if (!(await exists(file + '.br'))) {
		jobs.push(
			brotliAsync(buf, {
				params: {
					[zlib.BROTLI_PARAM_QUALITY]: brotliQuality(buf.length),
					[zlib.BROTLI_PARAM_SIZE_HINT]: buf.length
				}
			}).then(async (out) => {
				if (out.length < buf.length) {
					await writeFile(file + '.br', out);
					written++;
					saved += buf.length - out.length;
				}
			})
		);
	}

	await Promise.all(jobs);
}

/** Run `tasks` with at most `limit` in flight at once. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
	let i = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (i < items.length) {
			const idx = i++;
			await fn(items[idx]);
		}
	});
	await Promise.all(workers);
}

const t0 = Date.now();
const files = await collect();
console.log(`[precompress] ${files.length} compressible files, ${CORES} cores`);
await pool(files, CORES, compressOne);
console.log(
	`[precompress] wrote ${written} files, saved ${(saved / 1048576).toFixed(1)} MB in ${(
		(Date.now() - t0) / 1000
	).toFixed(1)}s`
);

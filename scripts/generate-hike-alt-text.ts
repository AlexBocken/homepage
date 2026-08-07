/**
 * Alt-text generator for hike photos.
 *
 * Companion to the recipe alt-text generator (`src/lib/server/ai/alttext.ts`),
 * but built as an offline script rather than an admin page: hike photos live in
 * the repo, not in Mongo, so the descriptions belong in the repo too. Results
 * are written to `src/content/hikes/<slug>/alt-text.json` and picked up by
 * `scripts/build-hikes.ts` on the next build.
 *
 * Usage:
 *   pnpm hikes:alt                              # every hike, only missing/stale
 *   pnpm hikes:alt -- --slug=2025-klausenpasswanderung
 *   pnpm hikes:alt -- --force                   # regenerate everything
 *   pnpm hikes:alt -- --limit=10 --dry-run      # try the prompt on a few images
 *   pnpm hikes:alt -- --model=gemma3:latest
 *
 * Only images that actually get published are described: `track.gpx` waypoint
 * photos, images referenced inline via `<HikeImage src="…">`, and `cover.*`.
 * Everything else in `images/` is dropped by the build, so describing it would
 * be wasted inference.
 *
 * Entries are keyed by source filename and carry the content hash they were
 * generated from, so re-running only touches images that are new or changed.
 * A hand-written entry can be pinned with `"locked": true` — the script never
 * overwrites those, not even with `--force`.
 */

import { promises as fs } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {
	parseGpxStages,
	parseGpxImageRefs,
	haversine,
	type GpxImageRef,
	type GpxPoint
} from '../src/lib/server/gpx.js';
import {
	buildPrompt,
	buildShorterPrompt,
	parseBilingual,
	wasTruncated,
	type HikeContext,
	type ShotContext
} from './hikeAltText.js';

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(process.cwd());
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'hikes');
// Written by build-hikes.ts. Read-only here: we want the canton/municipality it
// already resolved, without this script making its own Swisstopo requests.
const GEOCODE_CACHE_FILE = path.join(ROOT, 'scripts', '.cache', 'hikes-geocode.json');

const ALT_FILE = 'alt-text.json';

/** Same default as the recipe generator, so both pipelines describe alike. */
const DEFAULT_MODEL = 'qwen3.5:9b';

/**
 * Longest edge handed to the vision model. Landscape photos carry more relevant
 * detail than a plated dish (ridgelines, cloud cover, trail surface), so this
 * sits a step above the recipe pipeline's 512 — still an order of magnitude
 * cheaper than the 1600px published variant.
 */
const VISION_MAX_DIMENSION = 768;

/** Hard cap on a single generate call. A stalled Ollama otherwise hangs forever. */
const OLLAMA_TIMEOUT_MS = 5 * 60 * 1000;

const COVER_RE = /^cover\.(jpe?g|png|webp|heic|heif)$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|heic|heif)$/i;

// ---------------------------------------------------------------------------
// .env (OLLAMA_URL). The repo's .env keeps trailing `# comments` on the same
// line, so a naive split-on-'=' loader would fold the comment into the URL.
// ---------------------------------------------------------------------------

function loadEnvValue(key: string): string | undefined {
	if (process.env[key]) return process.env[key];
	try {
		const raw = readFileSync(path.join(ROOT, '.env'), 'utf-8');
		for (const line of raw.split('\n')) {
			const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
			if (!m || m[1] !== key) continue;
			const rest = m[2].trim();
			const quoted = rest.match(/^"([^"]*)"|^'([^']*)'/);
			if (quoted) return quoted[1] ?? quoted[2];
			// Unquoted: value ends at the first whitespace or comment marker.
			return rest.split(/\s+#|\s/)[0];
		}
	} catch {
		// No .env — fall through to the default below.
	}
	return undefined;
}

const OLLAMA_URL = loadEnvValue('OLLAMA_URL') ?? 'http://localhost:11434';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type Options = {
	slugs: string[] | null;
	force: boolean;
	dryRun: boolean;
	model: string;
	limit: number | null;
};

function parseArgs(argv: string[]): Options {
	const opts: Options = { slugs: null, force: false, dryRun: false, model: DEFAULT_MODEL, limit: null };
	for (const arg of argv) {
		if (arg === '--force') opts.force = true;
		else if (arg === '--dry-run') opts.dryRun = true;
		else if (arg.startsWith('--slug=')) {
			const v = arg.slice('--slug='.length);
			opts.slugs = (opts.slugs ?? []).concat(v.split(',').map((s) => s.trim()).filter(Boolean));
		} else if (arg.startsWith('--model=')) opts.model = arg.slice('--model='.length);
		else if (arg.startsWith('--limit=')) opts.limit = Math.max(0, parseInt(arg.slice('--limit='.length), 10) || 0);
		else if (arg === '--help' || arg === '-h') {
			console.log(
				'Usage: pnpm hikes:alt -- [--slug=<slug>[,<slug>]] [--force] [--dry-run] [--model=<name>] [--limit=N]'
			);
			process.exit(0);
		} else if (arg.startsWith('--')) {
			console.warn(`[hike-alt] Unknown flag ${arg} — ignored`);
		}
	}
	return opts;
}

// ---------------------------------------------------------------------------
// Stored file format
// ---------------------------------------------------------------------------

type AltEntry = {
	/** Content hash of the source image this text describes (sha256, 8 hex). */
	hash: string;
	de: string;
	en: string;
	/** Set by hand to keep the script from ever touching this entry again. */
	locked?: boolean;
	model?: string;
	generatedAt?: string;
};

type AltFile = Record<string, AltEntry>;

async function readAltFile(hikeDir: string): Promise<AltFile> {
	try {
		const raw = await fs.readFile(path.join(hikeDir, ALT_FILE), 'utf-8');
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? (parsed as AltFile) : {};
	} catch {
		return {};
	}
}

async function writeAltFile(hikeDir: string, data: AltFile): Promise<void> {
	// Sorted keys so the committed diff is a clean per-image change rather than
	// a reshuffle of the whole file whenever a photo is added.
	const sorted: AltFile = {};
	for (const key of Object.keys(data).sort()) sorted[key] = data[key];
	await fs.writeFile(path.join(hikeDir, ALT_FILE), JSON.stringify(sorted, null, '\t') + '\n');
}

// ---------------------------------------------------------------------------
// Hike context (what the model gets told about the hike beyond the pixels)
// ---------------------------------------------------------------------------

type Frontmatter = Record<string, string | number | boolean | string[]>;

/** Same tiny parser build-hikes uses — the frontmatter schema is small. */
function parseFrontmatter(source: string): Frontmatter {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) return {};
	const data: Frontmatter = {};
	for (const rawLine of match[1].split(/\r?\n/)) {
		const line = rawLine.replace(/\s+#.*$/, '').trim();
		if (!line || line.startsWith('#')) continue;
		const sep = line.indexOf(':');
		if (sep < 0) continue;
		data[line.slice(0, sep).trim()] = parseScalar(line.slice(sep + 1).trim());
	}
	return data;
}

function parseScalar(raw: string): string | number | boolean | string[] {
	if (raw === '') return '';
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	if (raw.startsWith('[') && raw.endsWith(']')) {
		return raw
			.slice(1, -1)
			.split(',')
			.map((s) => stripQuotes(s.trim()))
			.filter((s) => s.length > 0);
	}
	if (/^-?\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
	return stripQuotes(raw);
}

function stripQuotes(s: string): string {
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		return s.slice(1, -1);
	}
	return s;
}

type GeocodeCache = Record<
	string,
	{ canton: string | null; municipality: string | null; region: string | null; country: string | null }
>;

async function loadGeocodeCache(): Promise<GeocodeCache> {
	try {
		return JSON.parse(await fs.readFile(GEOCODE_CACHE_FILE, 'utf-8'));
	} catch {
		return {};
	}
}

const MONTHS_DE = [
	'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
	'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

/** Everything the model should know about the hike as a whole. */
function buildHikeContext(fm: Frontmatter, geo: GeocodeCache[string] | undefined): HikeContext {
	const date = typeof fm.date === 'string' ? fm.date : '';
	const monthIdx = /^\d{4}-(\d{2})/.exec(date)?.[1];
	const placeParts = [geo?.municipality, geo?.canton].filter((s): s is string => Boolean(s));
	if (geo?.country && geo.country !== 'CH') placeParts.push(geo.country);
	else if (geo?.canton) placeParts.push('Schweiz');

	return {
		title: typeof fm.title === 'string' ? fm.title : '',
		summary: typeof fm.summary === 'string' ? fm.summary : '',
		month: monthIdx ? MONTHS_DE[parseInt(monthIdx, 10) - 1] ?? '' : '',
		difficulty: typeof fm.difficulty === 'string' ? fm.difficulty : '',
		tags: Array.isArray(fm.tags) ? fm.tags : [],
		place: placeParts.join(', ')
	};
}

// ---------------------------------------------------------------------------
// Ollama (small local client — the server module under src/lib/server/ai reads
// $env/static/private, which only resolves inside a SvelteKit runtime)
// ---------------------------------------------------------------------------

async function generateWithOllama(model: string, prompt: string, imageBase64: string): Promise<string> {
	const res = await fetch(`${OLLAMA_URL}/api/generate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			prompt,
			images: [imageBase64],
			stream: false,
			think: false,
			keep_alive: '15m',
			options: {
				temperature: 0.3,
				// `num_predict`, NOT `max_tokens` — Ollama silently ignores unknown
				// option keys, and the model then rambles to its own stop token.
				num_predict: 200
			}
		}),
		signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '<unreadable body>');
		throw new Error(`Ollama ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
	}

	const data = (await res.json()) as { response?: string };
	if (typeof data.response !== 'string') throw new Error('Ollama response had no "response" field');
	return data.response.trim();
}

async function checkOllama(model: string): Promise<void> {
	const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) }).catch(
		(err) => {
			throw new Error(`Ollama unreachable at ${OLLAMA_URL}: ${err instanceof Error ? err.message : err}`);
		}
	);
	if (!res.ok) throw new Error(`Ollama at ${OLLAMA_URL} returned ${res.status} for /api/tags`);
	const data = (await res.json()) as { models?: Array<{ name: string }> };
	const names = data.models?.map((m) => m.name) ?? [];
	if (!names.includes(model)) {
		console.warn(
			`[hike-alt] Model "${model}" is not in the server's list (${names.join(', ') || '<none>'}). ` +
				`Trying anyway — Ollama may pull it.`
		);
	}
}

// ---------------------------------------------------------------------------
// Per-hike work
// ---------------------------------------------------------------------------

function shortHash(buf: Buffer): string {
	return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

/** Cumulative distance along the flat track, in km, per point index. */
function cumulativeDistances(track: GpxPoint[]): number[] {
	const out = new Array<number>(track.length).fill(0);
	for (let i = 1; i < track.length; i++) out[i] = out[i - 1] + haversine(track[i - 1], track[i]);
	return out;
}

/** Where on the route a waypoint photo sits, matched by capture time. */
function shotContextFor(ref: GpxImageRef | undefined, track: GpxPoint[], cumKm: number[]): ShotContext {
	const shot: ShotContext = {};
	if (!ref) return shot;
	if (typeof ref.altitude === 'number' && Number.isFinite(ref.altitude)) shot.altitudeM = ref.altitude;
	if (typeof ref.timestamp !== 'number' || track.length === 0) return shot;

	let startTs: number | null = null;
	for (const p of track) {
		if (typeof p.timestamp === 'number') {
			startTs = p.timestamp;
			break;
		}
	}
	if (startTs === null) return shot;

	const elapsedMs = ref.timestamp - startTs;
	if (elapsedMs >= 0) shot.elapsedMin = Math.round(elapsedMs / 60000);

	let bestIdx = -1;
	let bestDelta = Infinity;
	for (let i = 0; i < track.length; i++) {
		const t = track[i].timestamp;
		if (typeof t !== 'number') continue;
		const d = Math.abs(t - ref.timestamp);
		if (d < bestDelta) {
			bestDelta = d;
			bestIdx = i;
		}
	}
	if (bestIdx >= 0) {
		shot.distanceKm = cumKm[bestIdx];
		shot.totalKm = cumKm[cumKm.length - 1];
	}
	return shot;
}

type Candidate = {
	name: string;
	filePath: string;
	buffer: Buffer;
	hash: string;
	shot: ShotContext;
	/** Sort key: capture time when known, filename otherwise. */
	order: number;
};

/**
 * The images the build will actually publish: `track.gpx` waypoints, prose
 * `<HikeImage src="…">` references, and the explicit `cover.*`.
 */
async function collectCandidates(
	hikeDir: string,
	svxSource: string,
	gpxSource: string
): Promise<{ candidates: Candidate[]; skipped: number }> {
	const imagesDir = path.join(hikeDir, 'images');
	const refs = parseGpxImageRefs(gpxSource);
	const stages = parseGpxStages(gpxSource);
	const track: GpxPoint[] = stages.flatMap((s) => s.points);
	const cumKm = cumulativeDistances(track);

	const proseNames = new Set<string>();
	for (const m of svxSource.matchAll(/<HikeImage\b[^>]*?\/?>/g)) {
		const src = m[0].match(/\bsrc\s*=\s*["']([^"']+)["']/);
		const name = src?.[1].split('/').pop();
		if (name) proseNames.add(name);
	}

	let files: string[] = [];
	try {
		files = (await fs.readdir(imagesDir)).filter((f) => IMAGE_RE.test(f)).sort();
	} catch {
		// A hike without an images/ dir still may have a root-level cover.*
	}

	const candidates: Candidate[] = [];
	let skipped = 0;

	for (const [i, name] of files.entries()) {
		const filePath = path.join(imagesDir, name);
		const buffer = await fs.readFile(filePath);
		const hash = shortHash(buffer);
		const ref = refs[hash];
		const isCover = COVER_RE.test(name);
		if (!ref && !proseNames.has(name) && !isCover) {
			skipped++;
			continue;
		}
		const shot = shotContextFor(ref, track, cumKm);
		candidates.push({ name, filePath, buffer, hash, shot, order: ref?.timestamp ?? i });
	}

	// Root-level cover.* (build-hikes looks in images/ first, then the hike root).
	if (!candidates.some((c) => COVER_RE.test(c.name))) {
		for (const entry of await fs.readdir(hikeDir).catch(() => [] as string[])) {
			if (!COVER_RE.test(entry)) continue;
			const filePath = path.join(hikeDir, entry);
			const buffer = await fs.readFile(filePath);
			candidates.push({ name: entry, filePath, buffer, hash: shortHash(buffer), shot: {}, order: -1 });
			break;
		}
	}

	candidates.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
	return { candidates, skipped };
}

async function encodeForVision(buffer: Buffer): Promise<string> {
	try {
		const out = await sharp(buffer)
			.rotate()
			.resize(VISION_MAX_DIMENSION, VISION_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 85 })
			.toBuffer();
		return out.toString('base64');
	} catch (err) {
		console.warn(`[hike-alt]   resize failed (${err instanceof Error ? err.message : err}) — sending original`);
		return buffer.toString('base64');
	}
}

type Stats = { generated: number; retried: number; failed: number; unpublished: number };

async function processHike(slug: string, opts: Options, geocode: GeocodeCache, stats: Stats): Promise<void> {
	const hikeDir = path.join(CONTENT_DIR, slug);

	let svxSource: string;
	let gpxSource: string;
	try {
		svxSource = await fs.readFile(path.join(hikeDir, 'index.svx'), 'utf-8');
	} catch {
		console.warn(`[hike-alt] ${slug}: no index.svx — skipping`);
		return;
	}
	try {
		gpxSource = await fs.readFile(path.join(hikeDir, 'track.gpx'), 'utf-8');
	} catch {
		gpxSource = '';
	}

	const fm = parseFrontmatter(svxSource);
	const stages = parseGpxStages(gpxSource);
	const track: GpxPoint[] = stages.flatMap((s) => s.points);
	const geo = track.length > 0 ? geocode[centroidKey(track)] : undefined;
	const hike = buildHikeContext(fm, geo);

	const { candidates, skipped: unpublished } = await collectCandidates(hikeDir, svxSource, gpxSource);
	stats.unpublished += unpublished;

	const existing = await readAltFile(hikeDir);
	const todo = candidates.filter((c) => {
		const prev = existing[c.name];
		if (prev?.locked) return false;
		if (!prev) return true;
		// Stale when the file changed under a stable name, or an earlier run
		// stored an empty description.
		return opts.force || prev.hash !== c.hash || !prev.de || !prev.en;
	});

	console.log(
		`\n[hike-alt] ${slug} — ${candidates.length} published image(s), ` +
			`${todo.length} to generate, ${unpublished} unpublished skipped` +
			(hike.place ? ` · ${hike.place}` : '')
	);
	if (todo.length === 0) return;

	let done = 0;
	for (const c of todo) {
		if (opts.limit !== null && stats.generated >= opts.limit) {
			console.log(`[hike-alt] limit of ${opts.limit} reached — stopping`);
			return;
		}
		done++;
		const label = `[${done}/${todo.length}] ${c.name}`;
		const t0 = Date.now();
		try {
			const imageBase64 = await encodeForVision(c.buffer);
			const response = await generateWithOllama(opts.model, buildPrompt(hike, c.shot), imageBase64);
			let parsed = parseBilingual(response);
			if (!parsed) {
				stats.failed++;
				console.warn(`[hike-alt]   ${label} — unparseable response: ${response.slice(0, 160).replace(/\n/g, ' ⏎ ')}`);
				continue;
			}
			// One shortening retry when the answer overran the cap. Keep it only
			// if it actually came back inside the limit — otherwise the truncated
			// first answer is still the better of the two.
			if (wasTruncated(parsed)) {
				const retry = parseBilingual(
					await generateWithOllama(opts.model, buildShorterPrompt(hike, c.shot), imageBase64)
				);
				if (retry && !wasTruncated(retry)) {
					parsed = retry;
					stats.retried++;
				}
			}
			stats.generated++;
			const secs = ((Date.now() - t0) / 1000).toFixed(1);
			console.log(`[hike-alt]   ${label} (${secs}s)\n              DE: ${parsed.de}\n              EN: ${parsed.en}`);
			if (opts.dryRun) continue;

			existing[c.name] = {
				hash: c.hash,
				de: parsed.de,
				en: parsed.en,
				model: opts.model,
				generatedAt: new Date().toISOString().slice(0, 10)
			};
			// Written after every image, not at the end of the hike: a run over a
			// few hundred photos takes long enough that an interrupted run must
			// not throw away everything it already paid for.
			await writeAltFile(hikeDir, existing);
		} catch (err) {
			stats.failed++;
			console.error(`[hike-alt]   ${label} — failed: ${err instanceof Error ? err.message : err}`);
		}
	}
}

/** Geocode-cache key: the centroid, rounded exactly as build-hikes rounds it. */
function centroidKey(track: GpxPoint[]): string {
	let sumLat = 0;
	let sumLng = 0;
	for (const p of track) {
		sumLat += p.lat;
		sumLng += p.lng;
	}
	const n = track.length || 1;
	return `${(sumLat / n).toFixed(5)},${(sumLng / n).toFixed(5)}`;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
	const opts = parseArgs(process.argv.slice(2));

	let slugs: string[];
	try {
		const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
		slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
	} catch {
		console.error(`[hike-alt] No hike content at ${CONTENT_DIR}`);
		process.exit(1);
	}

	if (opts.slugs) {
		const missing = opts.slugs.filter((s) => !slugs.includes(s));
		if (missing.length > 0) {
			console.error(`[hike-alt] Unknown slug(s): ${missing.join(', ')}`);
			process.exit(1);
		}
		slugs = opts.slugs;
	}

	await checkOllama(opts.model);

	console.log(
		`[hike-alt] ${slugs.length} hike(s) · model=${opts.model} · ${OLLAMA_URL}` +
			(opts.force ? ' · FORCE' : '') +
			(opts.dryRun ? ' · DRY RUN (nothing written)' : '') +
			(opts.limit !== null ? ` · limit ${opts.limit}` : '')
	);

	const geocode = await loadGeocodeCache();
	const stats: Stats = { generated: 0, retried: 0, failed: 0, unpublished: 0 };
	const t0 = Date.now();

	for (const slug of slugs) {
		if (opts.limit !== null && stats.generated >= opts.limit) break;
		await processHike(slug, opts, geocode, stats);
	}

	const mins = ((Date.now() - t0) / 60000).toFixed(1);
	console.log(
		`\n[hike-alt] Done in ${mins} min — ${stats.generated} generated ` +
			`(${stats.retried} shortened on retry), ${stats.failed} failed, ` +
			`${stats.unpublished} unpublished images skipped.` +
			(opts.dryRun ? ' (dry run — no files written)' : ` Re-run \`pnpm exec vite-node scripts/build-hikes.ts\` to apply.`)
	);
	if (stats.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
	console.error('[hike-alt] Fatal:', err);
	process.exit(1);
});
